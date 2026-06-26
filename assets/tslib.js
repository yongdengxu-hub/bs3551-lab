/* BS3551 shared time-series math — window.TS
   Everything computed from first principles so the picture always matches the
   algebra students derive by hand. No hard-coded per-model ACF formulas. */
(function (global) {
  "use strict";

  // Seeded RNG (mulberry32) + Box-Muller Gaussian, so "new sample" is reproducible.
  function rng(s) {
    let a = s | 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussFactory(r) {
    let spare = null;
    return function () {
      if (spare !== null) { const v = spare; spare = null; return v; }
      let u = 0, v = 0, s = 0;
      do { u = 2 * r() - 1; v = 2 * r() - 1; s = u * u + v * v; } while (s === 0 || s >= 1);
      const m = Math.sqrt(-2 * Math.log(s) / s);
      spare = v * m; return u * m;
    };
  }

  // Roots of 1 + c1 z + c2 z^2 — true iff ALL roots lie outside the unit circle.
  function rootsOutside(c1, c2) {
    if (c2 === 0) { if (c1 === 0) return true; return Math.abs(1 / c1) > 1; }
    const disc = c1 * c1 - 4 * c2;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const r1 = (-c1 + sq) / (2 * c2), r2 = (-c1 - sq) / (2 * c2);
      return Math.abs(r1) > 1 && Math.abs(r2) > 1;
    }
    const re = -c1 / (2 * c2), im = Math.sqrt(-disc) / (2 * c2);
    return Math.sqrt(re * re + im * im) > 1;
  }
  // AR poly is 1 - phi1 z - phi2 z^2  ->  c1 = -phi1, c2 = -phi2
  function isStationary(phi) {
    if (phi.length === 0) return true;
    if (phi.length === 1) return rootsOutside(-phi[0], 0);
    return rootsOutside(-phi[0], -phi[1]);
  }
  // MA poly is 1 + theta1 z + theta2 z^2
  function isInvertible(theta) {
    if (theta.length === 0) return true;
    if (theta.length === 1) return rootsOutside(theta[0], 0);
    return rootsOutside(theta[0], theta[1]);
  }

  // MA(infinity) psi-weights of an ARMA(p,q): psi_j = theta_j + sum_i phi_i psi_{j-i}
  function psiWeights(phi, theta, J) {
    const p = phi.length, q = theta.length;
    const w = new Array(J + 1).fill(0); w[0] = 1;
    for (let j = 1; j <= J; j++) {
      let v = (j <= q) ? theta[j - 1] : 0;
      for (let i = 1; i <= p; i++) { if (j - i >= 0) v += phi[i - 1] * w[j - i]; }
      w[j] = v;
    }
    return w;
  }
  // Theoretical ACF via gamma_k = sigma^2 * sum_j psi_j psi_{j+k} (sigma^2 cancels in rho).
  function theoreticalACF(phi, theta, K) {
    const J = 600, w = psiWeights(phi, theta, J), g = [];
    for (let k = 0; k <= K; k++) {
      let s = 0; for (let j = 0; j + k <= J; j++) s += w[j] * w[j + k];
      g.push(s);
    }
    return g.map(x => x / g[0]); // rho[0] = 1
  }
  // PACF from ACF via the Durbin-Levinson recursion. Returns [0, phi11, phi22, ...].
  function pacfFromACF(rho, K) {
    const out = new Array(K + 1).fill(0); let prev = [];
    for (let k = 1; k <= K; k++) {
      let num = rho[k]; for (let j = 1; j < k; j++) num -= prev[j] * rho[k - j];
      let den = 1; for (let j = 1; j < k; j++) den -= prev[j] * rho[j];
      const kk = den === 0 ? 0 : num / den;
      const cu = new Array(k + 1).fill(0); cu[k] = kk;
      for (let j = 1; j < k; j++) cu[j] = prev[j] - kk * prev[k - j];
      out[k] = kk; prev = cu;
    }
    return out;
  }
  function simulate(phi, theta, T, r) {
    const p = phi.length, q = theta.length, burn = 200, n = T + burn;
    const g = gaussFactory(r), e = new Array(n);
    for (let t = 0; t < n; t++) e[t] = g();
    const y = new Array(n).fill(0);
    for (let t = 0; t < n; t++) {
      let v = e[t];
      for (let i = 1; i <= q; i++) { if (t - i >= 0) v += theta[i - 1] * e[t - i]; }
      for (let i = 1; i <= p; i++) { if (t - i >= 0) v += phi[i - 1] * y[t - i]; }
      y[t] = v;
    }
    return y.slice(burn);
  }
  function sampleACF(y, K) {
    const T = y.length, m = y.reduce((a, b) => a + b, 0) / T, d = y.map(v => v - m);
    const c0 = d.reduce((a, b) => a + b * b, 0) / T, r = [1];
    for (let k = 1; k <= K; k++) { let s = 0; for (let t = k; t < T; t++) s += d[t] * d[t - k]; r.push((s / T) / c0); }
    return r;
  }

  // ---- Forecasting (AR(p)) ----
  // Point forecasts h = 1..H given the last p actuals (oldest..newest).
  function arForecast(phi, c, hist, H) {
    const p = phi.length, buf = hist.slice(), out = [];
    for (let h = 1; h <= H; h++) {
      let v = c; for (let i = 1; i <= p; i++) v += phi[i - 1] * buf[buf.length - i];
      buf.push(v); out.push(v);
    }
    return out;
  }
  // Forecast-error variance Var(e_h) = sigma2 * sum_{j=0}^{h-1} psi_j^2.
  function arForecastVar(phi, sigma2, H) {
    const w = psiWeights(phi, [], H - 1), out = []; let cum = 0;
    for (let h = 1; h <= H; h++) { cum += w[h - 1] * w[h - 1]; out.push(sigma2 * cum); }
    return out;
  }
  function unconditionalMean(phi, c) {
    const s = phi.reduce((a, b) => a + b, 0);
    return s >= 1 ? NaN : c / (1 - s);
  }

  // ---- Regularised regression (Topic 6: machine learning) ----
  // X is assumed column-standardised and y centred (no intercept). Penalty scaling
  // follows glmnet: objective is (1/2n)||y - Xb||^2 + penalty, so lambda is comparable
  // across LASSO and Ridge.

  // Solve A x = b by Gaussian elimination with partial pivoting.
  function solveLinear(A, b) {
    const n = b.length, M = A.map((row, i) => row.concat([b[i]]));
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      const t = M[col]; M[col] = M[piv]; M[piv] = t;
      const d = M[col][col] || 1e-12;
      for (let c = col; c <= n; c++) M[col][c] /= d;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = M[r][col];
        if (f !== 0) for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
      }
    }
    return M.map(row => row[n]);
  }
  // Ridge (L2): minimise (1/2n)||y-Xb||^2 + (lambda/2)||b||^2.  Closed form.
  function ridgeFit(X, y, lambda) {
    const n = X.length, k = X[0].length, A = [], b = new Array(k).fill(0);
    for (let a = 0; a < k; a++) {
      const row = new Array(k).fill(0);
      for (let c = 0; c < k; c++) { let s = 0; for (let i = 0; i < n; i++) s += X[i][a] * X[i][c]; row[c] = s / n + (a === c ? lambda : 0); }
      A.push(row);
      let s = 0; for (let i = 0; i < n; i++) s += X[i][a] * y[i]; b[a] = s / n;
    }
    return solveLinear(A, b);
  }
  // LASSO (L1): minimise (1/2n)||y-Xb||^2 + lambda*||b||_1, by coordinate descent
  // with soft-thresholding (the glmnet algorithm). Warm-start via betaInit for paths.
  function lassoFit(X, y, lambda, betaInit, iters) {
    const n = X.length, k = X[0].length;
    const beta = betaInit ? betaInit.slice() : new Array(k).fill(0);
    const r = y.map((v, i) => { let m = 0; for (let j = 0; j < k; j++) m += X[i][j] * beta[j]; return v - m; });
    iters = iters || 300;
    for (let it = 0; it < iters; it++) {
      let maxChange = 0;
      for (let j = 0; j < k; j++) {
        let xr = 0, xx = 0;
        for (let i = 0; i < n; i++) { xr += X[i][j] * r[i]; xx += X[i][j] * X[i][j]; }
        const z = xx / n, rho = (xr + beta[j] * xx) / n;
        const bnew = Math.sign(rho) * Math.max(Math.abs(rho) - lambda, 0) / (z || 1e-12);
        const diff = bnew - beta[j];
        if (diff !== 0) { for (let i = 0; i < n; i++) r[i] -= X[i][j] * diff; beta[j] = bnew; if (Math.abs(diff) > maxChange) maxChange = Math.abs(diff); }
      }
      if (maxChange < 1e-7) break;
    }
    return beta;
  }
  // Smallest lambda that drives every LASSO coefficient to zero.
  function lassoLambdaMax(X, y) {
    const n = X.length, k = X[0].length; let m = 0;
    for (let j = 0; j < k; j++) { let s = 0; for (let i = 0; i < n; i++) s += X[i][j] * y[i]; m = Math.max(m, Math.abs(s / n)); }
    return m;
  }

  // ---- GARCH / volatility (Topic 4) ----
  // sigma^2_t = omega + (alpha + gamma*1[r_{t-1}<0]) r^2_{t-1} + beta sigma^2_{t-1}.
  // gamma = 0 gives plain GARCH(1,1); gamma > 0 gives the GJR leverage term.
  function garchSimulate(omega, alpha, beta, gamma, T, r) {
    const g = gaussFactory(r), burn = 300, n = T + burn;
    const pers = alpha + beta + (gamma || 0) / 2;
    let s2 = pers < 1 ? omega / (1 - pers) : omega;
    let rPrev = Math.sqrt(Math.max(s2, 1e-12)) * g();
    const ret = [], sig2 = [];
    for (let t = 1; t <= n; t++) {
      const lev = gamma ? gamma * (rPrev < 0 ? 1 : 0) : 0;
      s2 = omega + (alpha + lev) * rPrev * rPrev + beta * s2;
      if (s2 > 1e8) s2 = 1e8;  // keep an explosive (non-stationary) choice renderable
      const rt = Math.sqrt(Math.max(s2, 1e-12)) * g();
      if (t > burn) { ret.push(rt); sig2.push(s2); }
      rPrev = rt;
    }
    return { r: ret, sigma2: sig2 };
  }
  // Multi-step variance forecast: sigma^2_{t+h|t} -> unconditional variance.
  function garchForecast(omega, alpha, beta, gamma, lastR, lastS2, H) {
    const pers = alpha + beta + (gamma || 0) / 2;
    const lev = gamma ? gamma * (lastR < 0 ? 1 : 0) : 0;
    let s2 = omega + (alpha + lev) * lastR * lastR + beta * lastS2;
    const out = [s2];
    for (let h = 2; h <= H; h++) { s2 = omega + pers * s2; out.push(s2); }
    return out;
  }

  // ---- Regime switching: TAR / STAR (Topic 5) ----
  // Self-exciting two-regime AR(1) on the lagged level. smooth=false is a sharp
  // threshold (TAR); smooth=true uses the logistic transition (STAR).
  function logisticG(z, gamma, r) { return 1 / (1 + Math.exp(-gamma * (z - r))); }
  function regimeSimulate(p, T, r) {
    const g = gaussFactory(r), burn = 200, n = T + burn, y = [], w = [];
    let prev = p.r;
    for (let t = 0; t < n; t++) {
      const G = p.smooth ? logisticG(prev, p.gamma, p.r) : (prev > p.r ? 1 : 0);
      const m = (1 - G) * (p.c1 + p.phi1 * prev) + G * (p.c2 + p.phi2 * prev);
      const yt = m + p.sigma * g();
      if (t >= burn) { y.push(yt); w.push(G); }
      prev = yt;
    }
    return { y: y, w: w };
  }

  // ---- VAR(1) & impulse responses (Topic 7) ----
  function mat2mul(X, Y) {
    return [
      [X[0][0]*Y[0][0]+X[0][1]*Y[1][0], X[0][0]*Y[0][1]+X[0][1]*Y[1][1]],
      [X[1][0]*Y[0][0]+X[1][1]*Y[1][0], X[1][0]*Y[0][1]+X[1][1]*Y[1][1]]
    ];
  }
  // Orthogonal-shock IRF for a bivariate VAR(1): psi_h = A^h.
  // out[h][i][j] = response of variable i to a unit shock in variable j at horizon h.
  function var1IRF(A, H) {
    let M = [[1, 0], [0, 1]]; const out = [M];
    for (let h = 1; h <= H; h++) { M = mat2mul(A, M); out.push(M); }
    return out;
  }
  // Stationary iff both eigenvalues of A lie inside the unit circle.
  function var1Stationary(A) {
    const tr = A[0][0] + A[1][1], det = A[0][0]*A[1][1] - A[0][1]*A[1][0], disc = tr*tr - 4*det;
    if (disc >= 0) { const s = Math.sqrt(disc); return Math.abs((tr+s)/2) < 1 && Math.abs((tr-s)/2) < 1; }
    return Math.sqrt(det) < 1;
  }

  global.TS = {
    rng, gaussFactory, rootsOutside, isStationary, isInvertible,
    psiWeights, theoreticalACF, pacfFromACF, simulate, sampleACF,
    arForecast, arForecastVar, unconditionalMean,
    solveLinear, ridgeFit, lassoFit, lassoLambdaMax,
    garchSimulate, garchForecast, logisticG, regimeSimulate,
    mat2mul, var1IRF, var1Stationary
  };
})(window);
