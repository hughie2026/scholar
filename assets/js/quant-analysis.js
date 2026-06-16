/* =========================================================
   Quantitative Analysis Suite
   Hughie's Online Lab
   - All computation runs locally in the browser.
   ========================================================= */

/* ===================== 1. STAT LIBRARY ===================== */
const Stat = (() => {

  // ---------- Special functions ----------
  function erf(x){
    const a1=0.254829592,a2=-0.284496736,a3=1.421413741,
          a4=-1.453152027,a5=1.061405429,p=0.3275911;
    const sign = x<0 ? -1 : 1; x = Math.abs(x);
    const t = 1/(1+p*x);
    const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
    return sign*y;
  }
  function logGamma(x){
    const c=[76.18009172947146,-86.50532032941677,24.01409824083091,
             -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
    let y=x, t=x+5.5;
    t -= (x+0.5)*Math.log(t);
    let ser=1.000000000190015;
    for(let j=0;j<6;j++){ y+=1; ser += c[j]/y; }
    return -t + Math.log(2.5066282746310005*ser/x);
  }
  // Regularized incomplete gamma P(a,x)
  function gammaP(a,x){
    if(x<0||a<=0) return NaN;
    if(x===0) return 0;
    if(x < a+1){
      // series
      let ap=a, sum=1/a, del=sum;
      for(let n=1;n<200;n++){
        ap+=1; del*=x/ap; sum+=del;
        if(Math.abs(del)<Math.abs(sum)*1e-12) break;
      }
      return sum*Math.exp(-x+a*Math.log(x)-logGamma(a));
    }else{
      // continued fraction Q
      let b=x+1-a, c=1e30, d=1/b, h=d;
      for(let i=1;i<200;i++){
        const an=-i*(i-a);
        b+=2; d=an*d+b; if(Math.abs(d)<1e-30) d=1e-30;
        c=b+an/c; if(Math.abs(c)<1e-30) c=1e-30;
        d=1/d; const del=d*c; h*=del;
        if(Math.abs(del-1)<1e-12) break;
      }
      return 1 - h*Math.exp(-x+a*Math.log(x)-logGamma(a));
    }
  }
  // Regularized incomplete beta I_x(a,b)
  function betaI(x,a,b){
    if(x<=0) return 0; if(x>=1) return 1;
    const lbeta = logGamma(a+b)-logGamma(a)-logGamma(b);
    const front = Math.exp(Math.log(x)*a + Math.log(1-x)*b + lbeta);
    function cf(x,a,b){
      const qab=a+b, qap=a+1, qam=a-1;
      let c=1, d=1-qab*x/qap;
      if(Math.abs(d)<1e-30) d=1e-30;
      d=1/d; let h=d;
      for(let m=1;m<=200;m++){
        const m2=2*m;
        let aa=m*(b-m)*x/((qam+m2)*(a+m2));
        d=1+aa*d; if(Math.abs(d)<1e-30) d=1e-30;
        c=1+aa/c; if(Math.abs(c)<1e-30) c=1e-30;
        d=1/d; h*=d*c;
        aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
        d=1+aa*d; if(Math.abs(d)<1e-30) d=1e-30;
        c=1+aa/c; if(Math.abs(c)<1e-30) c=1e-30;
        d=1/d; const del=d*c; h*=del;
        if(Math.abs(del-1)<1e-12) break;
      }
      return h;
    }
    if(x < (a+1)/(a+b+2)) return front*cf(x,a,b)/a;
    return 1 - front*cf(1-x,b,a)/b;
  }

  // ---------- Distribution CDFs / p-values ----------
  const normalCDF = z => 0.5*(1+erf(z/Math.SQRT2));
  // two-tailed normal p
  const normalP2 = z => 2*(1 - normalCDF(Math.abs(z)));

  function tCDF(t,df){
    const x = df/(df + t*t);
    const p = 0.5*betaI(x, df/2, 0.5);
    return t>=0 ? 1-p : p;
  }
  const tP2 = (t,df) => 2*(1 - tCDF(Math.abs(t), df));

  const chiSqCDF = (x,df) => gammaP(df/2, x/2);
  const chiSqP   = (x,df) => 1 - chiSqCDF(x,df);

  function fCDF(F,d1,d2){
    if(F<=0) return 0;
    return 1 - betaI(d2/(d2+d1*F), d2/2, d1/2);
  }
  const fP = (F,d1,d2) => 1 - fCDF(F,d1,d2);

  // ---------- Descriptive ----------
  function summary(arr){
    const x = arr.filter(v => Number.isFinite(v)).slice().sort((a,b)=>a-b);
    const n = x.length;
    if(!n) return null;
    const sum = x.reduce((s,v)=>s+v,0);
    const mean = sum/n;
    const variance = n>1 ? x.reduce((s,v)=>s+(v-mean)**2,0)/(n-1) : 0;
    const sd = Math.sqrt(variance);
    const se = sd/Math.sqrt(n);
    const q = p => {
      if(n===1) return x[0];
      const pos = (n-1)*p, lo = Math.floor(pos), hi = Math.ceil(pos);
      return x[lo] + (x[hi]-x[lo])*(pos-lo);
    };
    return {
      n, mean, sd, se, variance,
      min:x[0], max:x[n-1],
      median:q(0.5), q1:q(0.25), q3:q(0.75),
      iqr:q(0.75)-q(0.25),
      sum
    };
  }

  function freqTable(arr){
    const map = new Map();
    arr.forEach(v=>{
      if(v===null||v===undefined||v==='') return;
      map.set(v, (map.get(v)||0)+1);
    });
    const total = [...map.values()].reduce((s,v)=>s+v,0);
    const rows = [...map.entries()]
      .sort((a,b)=>b[1]-a[1])
      .map(([k,c])=>({value:String(k), count:c, pct:c/total*100}));
    return {rows, total};
  }

  // ---------- t-tests ----------
  function tTestOne(arr, mu0=0){
    const s = summary(arr); if(!s||s.n<2) return null;
    const t = (s.mean-mu0)/s.se;
    const df = s.n-1;
    const p = tP2(t,df);
    const ciHalf = 1.96*s.se; // approx; use t-quantile for precise
    return {n:s.n, mean:s.mean, sd:s.sd, t, df, p,
      ci:[s.mean-ciHalf, s.mean+ciHalf], mu0};
  }
  function tTestInd(a,b, equalVar=false){
    const sa=summary(a), sb=summary(b);
    if(!sa||!sb||sa.n<2||sb.n<2) return null;
    const md = sa.mean - sb.mean;
    let t,df,se;
    if(equalVar){
      const sp2 = ((sa.n-1)*sa.variance + (sb.n-1)*sb.variance)/(sa.n+sb.n-2);
      se = Math.sqrt(sp2*(1/sa.n + 1/sb.n));
      t = md/se; df = sa.n+sb.n-2;
    }else{
      se = Math.sqrt(sa.variance/sa.n + sb.variance/sb.n);
      t = md/se;
      df = (sa.variance/sa.n + sb.variance/sb.n)**2 /
           ((sa.variance/sa.n)**2/(sa.n-1) + (sb.variance/sb.n)**2/(sb.n-1));
    }
    return {sa, sb, meanDiff:md, se, t, df, p:tP2(t,df), equalVar};
  }
  function tTestPaired(a,b){
    if(a.length!==b.length) return null;
    const d = a.map((v,i)=>v-b[i]).filter(v=>Number.isFinite(v));
    return tTestOne(d, 0);
  }

  // ---------- ANOVA (one-way) ----------
  function anova(groups){
    const valid = groups.filter(g=>g.length>1);
    if(valid.length<2) return null;
    const all = [].concat(...valid);
    const grand = all.reduce((s,v)=>s+v,0)/all.length;
    let ssB=0, ssW=0;
    valid.forEach(g=>{
      const m = g.reduce((s,v)=>s+v,0)/g.length;
      ssB += g.length*(m-grand)**2;
      g.forEach(v=> ssW += (v-m)**2);
    });
    const k = valid.length, N = all.length;
    const dfB = k-1, dfW = N-k;
    const msB = ssB/dfB, msW = ssW/dfW;
    const F = msB/msW;
    const p = fP(F, dfB, dfW);
    const eta2 = ssB/(ssB+ssW);
    return {ssB, ssW, dfB, dfW, msB, msW, F, p, k, N, eta2};
  }

  // ---------- Chi-square (independence) ----------
  function chiSquare(rows){
    // rows: array of arrays = observed contingency table
    const r = rows.length, c = rows[0].length;
    const rowSums = rows.map(row=>row.reduce((s,v)=>s+v,0));
    const colSums = Array(c).fill(0);
    rows.forEach(row=> row.forEach((v,j)=> colSums[j]+=v));
    const N = rowSums.reduce((s,v)=>s+v,0);
    let chi2=0; const expected=[];
    for(let i=0;i<r;i++){
      const expRow=[];
      for(let j=0;j<c;j++){
        const e = rowSums[i]*colSums[j]/N;
        expRow.push(e);
        if(e>0) chi2 += (rows[i][j]-e)**2 / e;
      }
      expected.push(expRow);
    }
    const df = (r-1)*(c-1);
    return {chi2, df, p:chiSqP(chi2,df), expected, observed:rows, rowSums, colSums, N};
  }

  // ---------- Non-parametric ----------
  function ranks(arr){
    // returns ranks with ties averaged
    const idx = arr.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
    const r = Array(arr.length);
    let i=0;
    while(i<idx.length){
      let j=i;
      while(j+1<idx.length && idx[j+1].v===idx[i].v) j++;
      const avg = (i+j)/2 + 1; // ranks 1-based
      for(let k=i;k<=j;k++) r[idx[k].i] = avg;
      i = j+1;
    }
    return r;
  }
  function mannWhitney(a,b){
    const all = a.concat(b), R = ranks(all);
    const n1=a.length, n2=b.length;
    const R1 = R.slice(0,n1).reduce((s,v)=>s+v,0);
    const U1 = R1 - n1*(n1+1)/2;
    const U2 = n1*n2 - U1;
    const U = Math.min(U1,U2);
    // normal approximation (with tie correction omitted for simplicity)
    const mu = n1*n2/2;
    const sigma = Math.sqrt(n1*n2*(n1+n2+1)/12);
    const z = (U - mu)/sigma;
    return {U, U1, U2, n1, n2, z, p:normalP2(z)};
  }
  function wilcoxonSigned(a,b){
    const d = a.map((v,i)=>v-b[i]).filter(v=>v!==0 && Number.isFinite(v));
    const abs = d.map(Math.abs);
    const R = ranks(abs);
    let Wp=0, Wn=0;
    d.forEach((v,i)=>{ if(v>0) Wp+=R[i]; else Wn+=R[i]; });
    const W = Math.min(Wp,Wn), n = d.length;
    const mu = n*(n+1)/4;
    const sigma = Math.sqrt(n*(n+1)*(2*n+1)/24);
    const z = (W - mu)/sigma;
    return {W, Wp, Wn, n, z, p:normalP2(z)};
  }
  function kruskalWallis(groups){
    const valid = groups.filter(g=>g.length>0);
    const all=[].concat(...valid), R=ranks(all);
    const N=all.length;
    let H=0, idx=0;
    valid.forEach(g=>{
      const Ri = R.slice(idx, idx+g.length).reduce((s,v)=>s+v,0);
      H += Ri*Ri/g.length;
      idx += g.length;
    });
    H = (12/(N*(N+1)))*H - 3*(N+1);
    const df = valid.length - 1;
    return {H, df, p:chiSqP(H,df), k:valid.length, N};
  }

  // ---------- Correlation ----------
  function pearson(x,y){
    const n = x.length;
    const mx = x.reduce((s,v)=>s+v,0)/n;
    const my = y.reduce((s,v)=>s+v,0)/n;
    let num=0, dx=0, dy=0;
    for(let i=0;i<n;i++){
      num += (x[i]-mx)*(y[i]-my);
      dx += (x[i]-mx)**2;
      dy += (y[i]-my)**2;
    }
    const r = num/Math.sqrt(dx*dy);
    const t = r*Math.sqrt((n-2)/(1-r*r));
    return {r, n, df:n-2, t, p:tP2(t,n-2)};
  }
  function spearman(x,y){
    const rx = ranks(x), ry = ranks(y);
    return pearson(rx, ry);
  }

  // ---------- Matrix utilities (for regression) ----------
  const M = {
    transpose: A => A[0].map((_,j)=>A.map(r=>r[j])),
    multiply: (A,B) => {
      const m=A.length, n=B[0].length, p=B.length;
      const C = Array.from({length:m},()=>Array(n).fill(0));
      for(let i=0;i<m;i++) for(let j=0;j<n;j++){
        let s=0; for(let k=0;k<p;k++) s += A[i][k]*B[k][j];
        C[i][j]=s;
      }
      return C;
    },
    // Solve Ax=b via Gauss-Jordan; A square
    inverse: A => {
      const n=A.length;
      const aug = A.map((r,i)=>{
        const row = r.slice();
        for(let j=0;j<n;j++) row.push(i===j ? 1 : 0);
        return row;
      });
      for(let i=0;i<n;i++){
        let pivot = aug[i][i], pr=i;
        for(let k=i+1;k<n;k++) if(Math.abs(aug[k][i])>Math.abs(pivot)){pivot=aug[k][i];pr=k;}
        if(pr!==i) [aug[i],aug[pr]]=[aug[pr],aug[i]];
        if(Math.abs(aug[i][i])<1e-12) throw new Error('Matrix is singular');
        const piv = aug[i][i];
        for(let j=0;j<2*n;j++) aug[i][j]/=piv;
        for(let k=0;k<n;k++) if(k!==i){
          const f = aug[k][i];
          for(let j=0;j<2*n;j++) aug[k][j] -= f*aug[i][j];
        }
      }
      return aug.map(r=>r.slice(n));
    }
  };

  // ---------- Linear Regression (OLS) ----------
  // X: nxp matrix (without intercept), y: n vector
  function linearReg(X, y, names){
    const n = y.length;
    // add intercept column
    const Xd = X.map(r=>[1,...r]);
    const Xt = M.transpose(Xd);
    const XtX = M.multiply(Xt, Xd);
    const XtXinv = M.inverse(XtX);
    const Xty = M.multiply(Xt, y.map(v=>[v]));
    const beta = M.multiply(XtXinv, Xty).map(r=>r[0]);
    const yhat = Xd.map(r=> r.reduce((s,v,i)=>s+v*beta[i],0));
    const resid = y.map((v,i)=> v - yhat[i]);
    const my = y.reduce((s,v)=>s+v,0)/n;
    const ssTot = y.reduce((s,v)=>s+(v-my)**2,0);
    const ssRes = resid.reduce((s,v)=>s+v*v,0);
    const ssReg = ssTot - ssRes;
    const p = beta.length;       // includes intercept
    const df = n - p;
    const mse = ssRes/df;
    const se = beta.map((_,i)=> Math.sqrt(mse*XtXinv[i][i]));
    const tStats = beta.map((b,i)=> b/se[i]);
    const pVals  = tStats.map(t=> tP2(t, df));
    const r2 = 1 - ssRes/ssTot;
    const adjR2 = 1 - (1-r2)*(n-1)/df;
    const F = (ssReg/(p-1)) / mse;
    const fp = fP(F, p-1, df);
    const coefNames = ['(Intercept)', ...names];
    return {coef:beta, se, t:tStats, p:pVals, names:coefNames,
      r2, adjR2, F, fDf:[p-1,df], fP:fp, n, df, mse,
      ssRes, ssReg, ssTot, residuals:resid, fitted:yhat};
  }

  // ---------- Logistic Regression (Newton-Raphson) ----------
  function logisticReg(X, y, names, maxIter=50){
    const n = y.length;
    const Xd = X.map(r=>[1,...r]);
    const p = Xd[0].length;
    let beta = Array(p).fill(0);
    let iter=0, converged=false;
    for(iter=0; iter<maxIter; iter++){
      const eta = Xd.map(r=> r.reduce((s,v,i)=>s+v*beta[i],0));
      const pi = eta.map(e=> 1/(1+Math.exp(-e)));
      const W = pi.map(pp=> pp*(1-pp));
      // gradient = X^T (y - p)
      const grad = Array(p).fill(0);
      for(let i=0;i<n;i++) for(let j=0;j<p;j++) grad[j] += Xd[i][j]*(y[i]-pi[i]);
      // Hessian = -X^T W X
      const H = Array.from({length:p},()=>Array(p).fill(0));
      for(let i=0;i<n;i++) for(let j=0;j<p;j++) for(let k=0;k<p;k++)
        H[j][k] -= Xd[i][j]*W[i]*Xd[i][k];
      const Hinv = M.inverse(H);
      const delta = M.multiply(Hinv, grad.map(v=>[v])).map(r=>r[0]);
      let maxd=0;
      for(let j=0;j<p;j++){ beta[j] -= delta[j]; if(Math.abs(delta[j])>maxd) maxd=Math.abs(delta[j]); }
      if(maxd<1e-7){ converged=true; break; }
    }
    // covariance = -H^-1
    const eta = Xd.map(r=> r.reduce((s,v,i)=>s+v*beta[i],0));
    const pi  = eta.map(e=> 1/(1+Math.exp(-e)));
    const W   = pi.map(pp=> pp*(1-pp));
    const H   = Array.from({length:p},()=>Array(p).fill(0));
    for(let i=0;i<n;i++) for(let j=0;j<p;j++) for(let k=0;k<p;k++)
      H[j][k] += Xd[i][j]*W[i]*Xd[i][k];
    const cov = M.inverse(H);
    const se = beta.map((_,i)=> Math.sqrt(cov[i][i]));
    const z = beta.map((b,i)=> b/se[i]);
    const pVals = z.map(zz=> normalP2(zz));
    const or = beta.map(b=> Math.exp(b));
    const orCI = beta.map((b,i)=> [Math.exp(b-1.96*se[i]), Math.exp(b+1.96*se[i])]);
    // log-likelihood
    let ll=0;
    for(let i=0;i<n;i++){
      const pp = Math.max(Math.min(pi[i],1-1e-12),1e-12);
      ll += y[i]*Math.log(pp) + (1-y[i])*Math.log(1-pp);
    }
    const yMean = y.reduce((s,v)=>s+v,0)/n;
    const ll0 = n*(yMean*Math.log(yMean+1e-12) + (1-yMean)*Math.log(1-yMean+1e-12));
    const lr = 2*(ll - ll0);
    const lrP = chiSqP(lr, p-1);
    const pseudoR2 = 1 - ll/ll0;
    return {coef:beta, se, z, p:pVals, or, orCI,
      names:['(Intercept)', ...names],
      ll, ll0, lr, lrDf:p-1, lrP, pseudoR2,
      iter, converged, n};
  }

  // ---------- Cox Regression (simplified, Breslow ties) ----------
  function coxReg(X, time, event, names, maxIter=50){
    const n = X.length;
    const p = X[0].length;
    // sort by time descending for risk set computation
    const idx = time.map((t,i)=>i).sort((a,b)=> time[a]-time[b]);
    const T = idx.map(i=>time[i]);
    const E = idx.map(i=>event[i]);
    const Xs = idx.map(i=>X[i]);
    let beta = Array(p).fill(0);
    let iter=0, converged=false;
    for(iter=0;iter<maxIter;iter++){
      const grad = Array(p).fill(0);
      const Hess = Array.from({length:p},()=>Array(p).fill(0));
      // compute exp(beta'x) for all
      const eb = Xs.map(r=> Math.exp(r.reduce((s,v,j)=>s+v*beta[j],0)));
      // for each event, sum over risk set j: T[j]>=T[i]
      for(let i=0;i<n;i++){
        if(!E[i]) continue;
        let S0=0; const S1=Array(p).fill(0);
        const S2=Array.from({length:p},()=>Array(p).fill(0));
        for(let k=i;k<n;k++){
          S0 += eb[k];
          for(let j=0;j<p;j++){
            S1[j] += Xs[k][j]*eb[k];
            for(let l=0;l<p;l++) S2[j][l] += Xs[k][j]*Xs[k][l]*eb[k];
          }
        }
        for(let j=0;j<p;j++){
          grad[j] += Xs[i][j] - S1[j]/S0;
          for(let l=0;l<p;l++){
            Hess[j][l] -= S2[j][l]/S0 - (S1[j]/S0)*(S1[l]/S0);
          }
        }
      }
      const Hinv = M.inverse(Hess);
      const delta = M.multiply(Hinv, grad.map(v=>[v])).map(r=>r[0]);
      let maxd=0;
      for(let j=0;j<p;j++){ beta[j] -= delta[j]; if(Math.abs(delta[j])>maxd) maxd=Math.abs(delta[j]); }
      if(maxd<1e-7){ converged=true; break; }
    }
    // covariance from -Hess^-1 with sign flipped (we built negative information)
    // recompute final Hessian for cov
    const eb = Xs.map(r=> Math.exp(r.reduce((s,v,j)=>s+v*beta[j],0)));
    const I = Array.from({length:p},()=>Array(p).fill(0));
    for(let i=0;i<n;i++){
      if(!E[i]) continue;
      let S0=0; const S1=Array(p).fill(0);
      const S2=Array.from({length:p},()=>Array(p).fill(0));
      for(let k=i;k<n;k++){
        S0 += eb[k];
        for(let j=0;j<p;j++){
          S1[j] += Xs[k][j]*eb[k];
          for(let l=0;l<p;l++) S2[j][l] += Xs[k][j]*Xs[k][l]*eb[k];
        }
      }
      for(let j=0;j<p;j++) for(let l=0;l<p;l++)
        I[j][l] += S2[j][l]/S0 - (S1[j]/S0)*(S1[l]/S0);
    }
    const cov = M.inverse(I);
    const se = beta.map((_,i)=> Math.sqrt(cov[i][i]));
    const z  = beta.map((b,i)=> b/se[i]);
    const pVals = z.map(zz=> normalP2(zz));
    const hr = beta.map(b=>Math.exp(b));
    const hrCI = beta.map((b,i)=>[Math.exp(b-1.96*se[i]), Math.exp(b+1.96*se[i])]);
    return {coef:beta, se, z, p:pVals, hr, hrCI, names, iter, converged, n,
      events:E.filter(v=>v).length};
  }

  // ---------- Time series (basic) ----------
  function autoCorr(x, lag){
    const n = x.length, m = x.reduce((s,v)=>s+v,0)/n;
    let num=0, den=0;
    for(let i=0;i<n;i++) den += (x[i]-m)**2;
    for(let i=0;i<n-lag;i++) num += (x[i]-m)*(x[i+lag]-m);
    return num/den;
  }
  function tsAnalysis(x){
    const n = x.length;
    const sumStat = summary(x);
    // linear trend
    const t = Array.from({length:n},(_,i)=>i+1);
    const tr = linearReg(t.map(v=>[v]), x, ['Time']);
    // ACF up to lag = min(20, n/4)
    const maxLag = Math.min(20, Math.floor(n/4));
    const acf = []; for(let k=1;k<=maxLag;k++) acf.push({lag:k, r:autoCorr(x,k)});
    // AR(1): x_t = phi*x_{t-1} + c
    const X1 = []; const Y1 = [];
    for(let i=1;i<n;i++){ X1.push([x[i-1]]); Y1.push(x[i]); }
    const ar1 = linearReg(X1, Y1, ['x_{t-1}']);
    // Ljung-Box at lag h = min(10, n/5)
    const h = Math.min(10, Math.floor(n/5));
    let Q=0; for(let k=1;k<=h;k++){ const r=autoCorr(x,k); Q += r*r/(n-k); }
    Q *= n*(n+2);
    const lbP = chiSqP(Q, h);
    return {n, summary:sumStat, trend:tr, acf, ar1, ljungBox:{Q, df:h, p:lbP}};
  }

  return {
    erf, normalCDF, normalP2, tCDF, tP2, chiSqCDF, chiSqP, fCDF, fP,
    summary, freqTable,
    tTestOne, tTestInd, tTestPaired,
    anova, chiSquare,
    mannWhitney, wilcoxonSigned, kruskalWallis,
    pearson, spearman,
    linearReg, logisticReg, coxReg, tsAnalysis,
    M
  };
})();

/* ===================== 2. UTILITIES ===================== */
const fmt = (v, d=4) => {
  if(v===null||v===undefined||Number.isNaN(v)) return '—';
  if(!Number.isFinite(v)) return v>0?'∞':'-∞';
  if(Math.abs(v) < 1e-4 && v !== 0) return v.toExponential(2);
  return Number(v).toFixed(d);
};
const pStr = p => {
  if(p===null||p===undefined||isNaN(p)) return '—';
  if(p<0.001) return '<0.001';
  return p.toFixed(3);
};
const isNumeric = v => v!=='' && v!==null && v!==undefined && !isNaN(parseFloat(v)) && isFinite(v);
const showToast = (msg='已複製到剪貼板') => {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>t.classList.remove('show'), 1800);
};

/* ===================== 3. CSV PARSER ===================== */
function parseCSV(text){
  const lines = text.replace(/\r\n/g,'\n').split('\n').filter(l=>l.trim());
  if(lines.length<2) throw new Error('數據不足，至少需要表頭和 1 行數據');
  const sep = (lines[0].includes('\t')) ? '\t' : ',';
  const headers = lines[0].split(sep).map(h=>h.trim());
  const rows = lines.slice(1).map(line=>{
    const cells = line.split(sep).map(c=>c.trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cells[i] !== undefined ? cells[i] : '');
    return obj;
  });
  // detect variable types
  const types = {};
  headers.forEach(h=>{
    const vals = rows.map(r=>r[h]).filter(v=>v!==''&&v!==null&&v.toUpperCase()!=='NA');
    const numCount = vals.filter(isNumeric).length;
    types[h] = (numCount/vals.length >= 0.9 && vals.length>0) ? 'numeric' : 'categorical';
  });
  return {headers, rows, types};
}

/* ===================== 4. SAMPLE DATA ===================== */
const SAMPLES = {
  clinical: `id,group,sex,age,bp_pre,bp_post,outcome
1,Control,M,55,142,140,0
2,Control,F,62,138,135,0
3,Control,M,48,150,148,1
4,Control,F,59,145,143,0
5,Control,M,67,155,152,1
6,Control,F,52,140,139,0
7,Control,M,60,148,145,0
8,Control,F,58,144,142,0
9,Control,M,49,151,149,1
10,Control,F,63,147,146,0
11,Treatment,M,56,143,128,0
12,Treatment,F,61,141,125,0
13,Treatment,M,50,149,130,0
14,Treatment,F,58,146,127,0
15,Treatment,M,65,156,135,1
16,Treatment,F,54,142,124,0
17,Treatment,M,59,150,131,0
18,Treatment,F,57,144,126,0
19,Treatment,M,51,148,129,0
20,Treatment,F,62,145,128,0`,
  survival: `id,time,event,treat,age
1,5,1,0,65
2,8,1,0,58
3,12,0,0,72
4,15,1,0,60
5,18,1,0,55
6,22,0,0,68
7,26,1,0,62
8,30,1,1,57
9,35,0,1,64
10,40,1,1,59
11,45,0,1,66
12,50,1,1,53
13,55,0,1,70
14,60,1,1,61
15,65,0,1,67
16,10,1,0,75
17,20,1,0,69
18,32,1,1,58
19,48,0,1,63
20,58,1,1,56`,
  timeseries: `period,value
1,102
2,105
3,103
4,108
5,112
6,110
7,115
8,118
9,116
10,122
11,125
12,123
13,128
14,131
15,129
16,134
17,138
18,136
19,141
20,144
21,142
22,148
23,151
24,149`
};

/* ===================== 5. STATE ===================== */
const State = {
  data: null,        // {headers, rows, types}
  analysis: null,    // analysis key
  config: {},        // user variable choices
  result: null       // analysis result for export
};

/* ===================== 6. WIZARD NAV ===================== */
let currentStep = 1;
const TOTAL_STEPS = 4;

function showStep(n){
  currentStep = n;
  document.querySelectorAll('.form-step').forEach(el=>{
    el.classList.toggle('active', +el.dataset.step === n);
  });
  document.querySelectorAll('.progress-steps .step').forEach(el=>{
    const s = +el.dataset.step;
    el.classList.toggle('active', s===n);
    el.classList.toggle('done',   s<n);
  });
  document.getElementById('progressFill').style.width = (n/TOTAL_STEPS*100)+'%';
  document.getElementById('prevBtn').disabled = n===1;
  document.getElementById('nextBtn').style.display = (n<3)?'inline-block':'none';
  document.getElementById('runBtn').style.display  = (n===3)?'inline-block':'none';
  document.querySelector('.form-nav:last-of-type').style.display = (n===4)?'none':'flex';
  if(n===3) renderConfig();
  window.scrollTo({top:0, behavior:'smooth'});
}

function validateStep(n){
  if(n===1){
    if(!State.data){
      showError('dataError','請先導入數據');
      return false;
    }
    return true;
  }
  if(n===2){
    const a = document.querySelector('input[name="analysis"]:checked');
    if(!a){ alert('請選擇一種分析類型'); return false; }
    State.analysis = a.value;
    return true;
  }
  return true;
}
function showError(id, msg){
  const el = document.getElementById(id);
  if(!el) return;
  if(!msg){ el.style.display='none'; return; }
  el.textContent = msg; el.style.display='block';
}

/* ===================== 7. STEP 1: DATA IMPORT ===================== */
function loadData(text){
  try{
    State.data = parseCSV(text);
    showError('dataError','');
    renderPreview();
  }catch(e){
    State.data = null;
    showError('dataError', e.message);
    document.getElementById('dataPreview').innerHTML='';
  }
}
function renderPreview(){
  if(!State.data) return;
  const {headers, rows, types} = State.data;
  const head = '<tr>' + headers.map(h=>`<th>${h} <small style="color:#c9a961;">${types[h]==='numeric'?'NUM':'CAT'}</small></th>`).join('') + '</tr>';
  const body = rows.slice(0,8).map(r=>'<tr>'+headers.map(h=>`<td>${r[h]??''}</td>`).join('')+'</tr>').join('');
  const more = rows.length>8 ? `<tr><td colspan="${headers.length}" style="text-align:center;color:#888;">… 共 ${rows.length} 行</td></tr>` : '';
  document.getElementById('dataPreview').innerHTML = `
    <div class="data-preview">
      <table>${head}${body}${more}</table>
    </div>
    <div class="data-stats">
      <span>行數 N = ${rows.length}</span>
      <span>變量數 = ${headers.length}</span>
      <span>連續變量 = ${headers.filter(h=>types[h]==='numeric').length}</span>
      <span>分類變量 = ${headers.filter(h=>types[h]==='categorical').length}</span>
    </div>`;
}

/* ===================== 8. STEP 3: CONFIG UI ===================== */
function renderConfig(){
  const c = document.getElementById('configContainer');
  c.innerHTML = '';
  if(!State.data){ c.innerHTML='<p style="color:#b94a4a;">尚未載入數據</p>'; return; }
  const {headers, types} = State.data;
  const numVars = headers.filter(h=>types[h]==='numeric');
  const catVars = headers.filter(h=>types[h]==='categorical');

  const sel = (id, label, opts) => `
    <div class="field">
      <label>${label}</label>
      <select id="${id}">${opts.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>
    </div>`;
  const multi = (id, label, opts) => `
    <div class="field">
      <label>${label}（可多選）</label>
      <div class="var-list" id="${id}">
        ${opts.map(o=>`<label><input type="checkbox" value="${o}"> ${o} <span class="var-type">${types[o]==='numeric'?'NUM':'CAT'}</span></label>`).join('')}
      </div>
    </div>`;

  let html = '';
  switch(State.analysis){
    case 'desc_continuous':
      html = multi('descNumVars','選擇連續變量', numVars);
      break;
    case 'desc_categorical':
      html = multi('descCatVars','選擇分類變量', catVars);
      break;
    case 'ttest':
      html = `
        <div class="field">
          <label>t 檢驗類型</label>
          <div class="radio-grid three">
            <label class="radio-card"><input type="radio" name="ttype" value="one" checked><span>單樣本<small>vs 已知均值</small></span></label>
            <label class="radio-card"><input type="radio" name="ttype" value="ind"><span>獨立樣本<small>兩組均值比較</small></span></label>
            <label class="radio-card"><input type="radio" name="ttype" value="paired"><span>配對樣本<small>同一組前後</small></span></label>
          </div>
        </div>
        <div id="ttestSubConfig"></div>`;
      break;
    case 'anova':
      html = sel('anovaY','因變量（連續）', numVars) + sel('anovaG','分組變量（分類）', catVars);
      break;
    case 'chisq':
      html = sel('chisqA','變量 A（分類）', catVars) + sel('chisqB','變量 B（分類）', catVars);
      break;
    case 'nonparam':
      html = `
        <div class="field">
          <label>非參數檢驗類型</label>
          <div class="radio-grid three">
            <label class="radio-card"><input type="radio" name="nptype" value="mw" checked><span>Mann-Whitney U<small>2 組獨立</small></span></label>
            <label class="radio-card"><input type="radio" name="nptype" value="kw"><span>Kruskal-Wallis<small>≥3 組獨立</small></span></label>
            <label class="radio-card"><input type="radio" name="nptype" value="wsr"><span>Wilcoxon 符號秩<small>配對</small></span></label>
          </div>
        </div>
        <div id="npSubConfig"></div>`;
      break;
    case 'correlation':
      html = `
        <div class="field">
          <label>相關係數類型</label>
          <div class="radio-row">
            <label class="radio-btn"><input type="radio" name="corMethod" value="pearson" checked><span>Pearson</span></label>
            <label class="radio-btn"><input type="radio" name="corMethod" value="spearman"><span>Spearman</span></label>
          </div>
        </div>` + multi('corVars','選擇連續變量（≥2 個）', numVars);
      break;
    case 'linear':
      html = sel('linY','因變量 Y（連續）', numVars) + multi('linX','自變量 X（連續）', numVars);
      break;
    case 'logistic':
      html = sel('logY','二分類結局 Y（取值僅 0/1）', headers) + multi('logX','自變量 X（連續或 0/1 編碼）', numVars);
      break;
    case 'cox':
      html = sel('coxT','時間變量', numVars)
           + sel('coxE','事件指示（1=事件,0=刪失）', headers)
           + multi('coxX','協變量', numVars);
      break;
    case 'timeseries':
      html = sel('tsVar','時間序列變量（按行順序排列）', numVars);
      break;
  }
  c.innerHTML = html;

  // sub-config logic for t-test / nonparam
  if(State.analysis==='ttest'){
    const sub = document.getElementById('ttestSubConfig');
    const renderSub = () => {
      const t = document.querySelector('input[name="ttype"]:checked').value;
      if(t==='one'){
        sub.innerHTML = sel('ttY','變量（連續）', numVars)
          + `<div class="field"><label>檢驗的均值 μ₀</label><input type="number" id="ttMu" value="0" step="any"></div>`;
      }else if(t==='ind'){
        sub.innerHTML = sel('ttY','因變量（連續）', numVars) + sel('ttG','分組變量（分類，恰好 2 組）', catVars);
      }else{
        sub.innerHTML = sel('ttA','變量 A（前/處理前）', numVars) + sel('ttB','變量 B（後/處理後）', numVars);
      }
    };
    renderSub();
    document.querySelectorAll('input[name="ttype"]').forEach(r=>r.addEventListener('change', renderSub));
  }
  if(State.analysis==='nonparam'){
    const sub = document.getElementById('npSubConfig');
    const renderSub = () => {
      const t = document.querySelector('input[name="nptype"]:checked').value;
      if(t==='mw'){
        sub.innerHTML = sel('npY','變量（連續/序級）', numVars) + sel('npG','分組變量（恰好 2 組）', catVars);
      }else if(t==='kw'){
        sub.innerHTML = sel('npY','變量（連續/序級）', numVars) + sel('npG','分組變量（≥2 組）', catVars);
      }else{
        sub.innerHTML = sel('npA','變量 A','--' === '--' ? numVars : numVars) + sel('npB','變量 B', numVars);
      }
    };
    renderSub();
    document.querySelectorAll('input[name="nptype"]').forEach(r=>r.addEventListener('change', renderSub));
  }

  // toggle "checked" class on multi
  c.querySelectorAll('.var-list input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', e=> e.target.closest('label').classList.toggle('checked', e.target.checked));
  });
}
function getMulti(id){
  return [...document.querySelectorAll(`#${id} input:checked`)].map(i=>i.value);
}

/* ===================== 9. RUN ANALYSIS ===================== */
function runAnalysis(){
  showError('configError','');
  try{
    const result = dispatch();
    State.result = result;
    renderResult(result);
    showStep(4);
  }catch(e){
    console.error(e);
    showError('configError', '分析失敗：'+e.message);
  }
}

function dispatch(){
  const {rows, types, headers} = State.data;
  const colNum = h => rows.map(r=>parseFloat(r[h])).filter(Number.isFinite);
  const colAll = h => rows.map(r=>r[h]);
  const numericRows = (cols) => rows.filter(r=>cols.every(c=>isNumeric(r[c])))
                                    .map(r=>cols.map(c=>parseFloat(r[c])));

  switch(State.analysis){
    case 'desc_continuous': {
      const vars = getMulti('descNumVars');
      if(vars.length===0) throw new Error('請至少選擇 1 個連續變量');
      const out = vars.map(v=>({var:v, ...Stat.summary(colNum(v))}));
      return {kind:'desc_continuous', vars, table:out};
    }
    case 'desc_categorical': {
      const vars = getMulti('descCatVars');
      if(vars.length===0) throw new Error('請至少選擇 1 個分類變量');
      const out = vars.map(v=>({var:v, ...Stat.freqTable(colAll(v))}));
      return {kind:'desc_categorical', vars, tables:out};
    }
    case 'ttest': {
      const t = document.querySelector('input[name="ttype"]:checked').value;
      if(t==='one'){
        const v = document.getElementById('ttY').value;
        const mu = parseFloat(document.getElementById('ttMu').value)||0;
        const r = Stat.tTestOne(colNum(v), mu);
        return {kind:'ttest_one', variable:v, mu, ...r};
      }else if(t==='ind'){
        const y = document.getElementById('ttY').value;
        const g = document.getElementById('ttG').value;
        const groups = {};
        rows.forEach(r=>{ if(isNumeric(r[y])) (groups[r[g]] = groups[r[g]]||[]).push(parseFloat(r[y])); });
        const keys = Object.keys(groups);
        if(keys.length!==2) throw new Error(`分組變量必須恰好 2 組，當前為 ${keys.length} 組（${keys.join(', ')}）`);
        const r = Stat.tTestInd(groups[keys[0]], groups[keys[1]], false);
        return {kind:'ttest_ind', y, g, groupA:keys[0], groupB:keys[1], ...r};
      }else{
        const a = document.getElementById('ttA').value;
        const b = document.getElementById('ttB').value;
        const xa=[], xb=[];
        rows.forEach(r=>{ if(isNumeric(r[a])&&isNumeric(r[b])){ xa.push(+r[a]); xb.push(+r[b]); } });
        const r = Stat.tTestPaired(xa, xb);
        return {kind:'ttest_paired', a, b, n:xa.length, ...r};
      }
    }
    case 'anova': {
      const y = document.getElementById('anovaY').value;
      const g = document.getElementById('anovaG').value;
      const groups = {};
      rows.forEach(r=>{ if(isNumeric(r[y])) (groups[r[g]] = groups[r[g]]||[]).push(+r[y]); });
      const keys = Object.keys(groups);
      const arrs = keys.map(k=>groups[k]);
      const r = Stat.anova(arrs);
      const desc = keys.map((k,i)=>({group:k, ...Stat.summary(arrs[i])}));
      return {kind:'anova', y, g, groups:keys, desc, ...r};
    }
    case 'chisq': {
      const a = document.getElementById('chisqA').value;
      const b = document.getElementById('chisqB').value;
      const setA = [...new Set(rows.map(r=>r[a]).filter(v=>v!==''&&v!=null))].sort();
      const setB = [...new Set(rows.map(r=>r[b]).filter(v=>v!==''&&v!=null))].sort();
      const obs = setA.map(_=> Array(setB.length).fill(0));
      rows.forEach(r=>{
        const i=setA.indexOf(r[a]), j=setB.indexOf(r[b]);
        if(i>=0&&j>=0) obs[i][j]++;
      });
      const r = Stat.chiSquare(obs);
      return {kind:'chisq', a, b, rowsLabels:setA, colsLabels:setB, ...r};
    }
    case 'nonparam': {
      const t = document.querySelector('input[name="nptype"]:checked').value;
      if(t==='mw'){
        const y = document.getElementById('npY').value;
        const g = document.getElementById('npG').value;
        const groups = {};
        rows.forEach(r=>{ if(isNumeric(r[y])) (groups[r[g]]=groups[r[g]]||[]).push(+r[y]); });
        const keys = Object.keys(groups);
        if(keys.length!==2) throw new Error(`分組必須恰好 2 組，當前 ${keys.length} 組`);
        const r = Stat.mannWhitney(groups[keys[0]], groups[keys[1]]);
        return {kind:'mw', y, g, groupA:keys[0], groupB:keys[1], ...r};
      }else if(t==='kw'){
        const y = document.getElementById('npY').value;
        const g = document.getElementById('npG').value;
        const groups = {};
        rows.forEach(r=>{ if(isNumeric(r[y])) (groups[r[g]]=groups[r[g]]||[]).push(+r[y]); });
        const keys = Object.keys(groups);
        const arrs = keys.map(k=>groups[k]);
        const r = Stat.kruskalWallis(arrs);
        const desc = keys.map((k,i)=>({group:k, ...Stat.summary(arrs[i])}));
        return {kind:'kw', y, g, groups:keys, desc, ...r};
      }else{
        const a = document.getElementById('npA').value;
        const b = document.getElementById('npB').value;
        const xa=[],xb=[];
        rows.forEach(r=>{ if(isNumeric(r[a])&&isNumeric(r[b])){xa.push(+r[a]); xb.push(+r[b]);} });
        const r = Stat.wilcoxonSigned(xa, xb);
        return {kind:'wsr', a, b, ...r};
      }
    }
    case 'correlation': {
      const method = document.querySelector('input[name="corMethod"]:checked').value;
      const vars = getMulti('corVars');
      if(vars.length<2) throw new Error('至少需要 2 個變量');
      const data = numericRows(vars);
      const cols = vars.map((_,j)=> data.map(r=>r[j]));
      const matrix=[];
      for(let i=0;i<vars.length;i++){
        const row=[];
        for(let j=0;j<vars.length;j++){
          if(i===j){ row.push({r:1,p:0,n:cols[i].length}); continue; }
          const c = method==='pearson' ? Stat.pearson(cols[i],cols[j]) : Stat.spearman(cols[i],cols[j]);
          row.push(c);
        }
        matrix.push(row);
      }
      return {kind:'correlation', method, vars, matrix};
    }
    case 'linear': {
      const y = document.getElementById('linY').value;
      const xs = getMulti('linX');
      if(xs.length===0) throw new Error('至少需要 1 個自變量');
      const cols = [y, ...xs];
      const data = rows.filter(r=>cols.every(c=>isNumeric(r[c])));
      const yArr = data.map(r=>+r[y]);
      const xArr = data.map(r=>xs.map(c=>+r[c]));
      const res = Stat.linearReg(xArr, yArr, xs);
      return {kind:'linear', y, xs, ...res};
    }
    case 'logistic': {
      const y = document.getElementById('logY').value;
      const xs = getMulti('logX');
      if(xs.length===0) throw new Error('至少需要 1 個自變量');
      const cols = [y, ...xs];
      const data = rows.filter(r=>cols.every(c=>isNumeric(r[c])));
      const yArr = data.map(r=>+r[y]);
      const uniq = [...new Set(yArr)];
      if(uniq.length!==2 || !uniq.every(v=>v===0||v===1))
        throw new Error('結局變量必須僅取 0 / 1');
      const xArr = data.map(r=>xs.map(c=>+r[c]));
      const res = Stat.logisticReg(xArr, yArr, xs);
      return {kind:'logistic', y, xs, ...res};
    }
    case 'cox': {
      const tVar = document.getElementById('coxT').value;
      const eVar = document.getElementById('coxE').value;
      const xs = getMulti('coxX');
      if(xs.length===0) throw new Error('至少需要 1 個協變量');
      const cols = [tVar, eVar, ...xs];
      const data = rows.filter(r=>cols.every(c=>isNumeric(r[c])));
      const time = data.map(r=>+r[tVar]);
      const event = data.map(r=>+r[eVar]);
      const X = data.map(r=>xs.map(c=>+r[c]));
      const res = Stat.coxReg(X, time, event, xs);
      return {kind:'cox', t:tVar, e:eVar, xs, ...res};
    }
    case 'timeseries': {
      const v = document.getElementById('tsVar').value;
      const series = colNum(v);
      const res = Stat.tsAnalysis(series);
      return {kind:'ts', variable:v, series, ...res};
    }
  }
  throw new Error('未知的分析類型');
}

/* ===================== 10. RENDER RESULT ===================== */
const METHOD_INFO = {
  desc_continuous: ['描述統計（連續變量）','Descriptive Statistics for Continuous Variables',
    '對連續變量計算集中趨勢（均值、中位數）與離散程度（標準差、IQR、極差），用於樣本特徵描述。'],
  desc_categorical:['描述統計（分類變量）','Descriptive Statistics for Categorical Variables',
    '對分類變量計算頻數與百分比分布，常用於人口學變量的特徵描述。'],
  ttest_one:       ['單樣本 t 檢驗','One-Sample t-Test',
    '檢驗樣本均值與某已知總體均值是否存在顯著差異。'],
  ttest_ind:       ['獨立樣本 t 檢驗','Independent Samples t-Test',
    '比較兩個獨立組的均值是否存在差異（採用 Welch 校正，不假定方差齊性）。'],
  ttest_paired:    ['配對 t 檢驗','Paired Samples t-Test',
    '比較同一組對象在兩種條件或兩個時點下的均值差異。'],
  anova:           ['單因素方差分析','One-Way ANOVA',
    '比較 3 組或更多獨立組的均值是否存在差異。'],
  chisq:           ['卡方獨立性檢驗','Chi-Square Test of Independence',
    '檢驗兩個分類變量之間是否相互獨立。'],
  mw:              ['Mann-Whitney U 檢驗','Mann-Whitney U Test',
    '兩組獨立樣本的非參數檢驗，適用於非正態分布或序級數據。'],
  kw:              ['Kruskal-Wallis 檢驗','Kruskal-Wallis H Test',
    'ANOVA 的非參數版本，比較 ≥3 組獨立樣本的中心位置差異。'],
  wsr:             ['Wilcoxon 符號秩檢驗','Wilcoxon Signed-Rank Test',
    '配對 t 檢驗的非參數版本，用於配對或前後測量差異。'],
  correlation:     ['相關分析','Correlation Analysis',
    '量化兩個變量間線性（Pearson）或單調（Spearman）關聯的強度與方向。'],
  linear:          ['多元線性迴歸','Multiple Linear Regression (OLS)',
    '在控制其他變量的條件下，估計連續結局與預測變量間的線性關係。'],
  logistic:        ['Logistic 迴歸','Logistic Regression',
    '結局為二分類時，估計各預測變量的勝算比（OR）。'],
  cox:             ['Cox 比例風險迴歸','Cox Proportional Hazards Regression',
    '生存資料分析，估計各協變量對風險的影響（HR），允許右刪失。'],
  ts:              ['時間序列分析','Time Series Analysis',
    '提供趨勢估計、自相關（ACF）、AR(1) 模型與 Ljung-Box 隨機性檢驗。']
};

function tableHTML(headers, rows, opts={}){
  return `<table class="res-table">
    <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>'<tr>'+r.map((c,i)=>{
      const isNum = typeof c==='number';
      const cls = isNum ? 'num' : '';
      const sigCls = (opts.pCol===i && typeof c==='number' && c<0.05) ? ' sig' : '';
      return `<td class="${cls}${sigCls}">${typeof c==='number'?fmt(c):c}</td>`;
    }).join('')+'</tr>').join('')}</tbody>
  </table>`;
}

function renderResult(R){
  const info = METHOD_INFO[R.kind] || ['分析結果','Result',''];
  document.getElementById('mName').textContent = info[0];
  document.getElementById('mEn').textContent = info[1];
  document.getElementById('mSummary').textContent = info[2];

  const sg = document.getElementById('summaryGrid');
  const rt = document.getElementById('resultTables');
  const ri = document.getElementById('resultInterpret');
  const mr = document.getElementById('methodReport');

  sg.innerHTML = ''; rt.innerHTML=''; ri.innerHTML=''; mr.textContent='';

  const summaryItems = (items) => {
    sg.innerHTML = items.map(([l,v])=>`
      <div class="summary-item"><div class="summary-label">${l}</div><div class="summary-value">${v}</div></div>`).join('');
  };

  switch(R.kind){
    case 'desc_continuous': {
      summaryItems([['變量數', R.vars.length],['樣本量 N', R.table[0]?.n ?? '—']]);
      const head = ['Variable','N','Mean','SD','Median','Q1','Q3','Min','Max'];
      const body = R.table.map(r=>[r.var, r.n, r.mean, r.sd, r.median, r.q1, r.q3, r.min, r.max]);
      rt.innerHTML = tableHTML(head, body);
      ri.innerHTML = R.table.map(r=>`<p><b>${r.var}</b>：N=${r.n}，平均 ${fmt(r.mean)} (SD=${fmt(r.sd)})；中位數 ${fmt(r.median)}（IQR ${fmt(r.q1)}–${fmt(r.q3)}）；範圍 ${fmt(r.min)}–${fmt(r.max)}。</p>`).join('');
      mr.textContent = `Descriptive statistics were calculated for ${R.vars.length} continuous variable(s). ${R.table.map(r=>`${r.var}: M = ${fmt(r.mean,2)}, SD = ${fmt(r.sd,2)}, Mdn = ${fmt(r.median,2)} (IQR = ${fmt(r.q1,2)}–${fmt(r.q3,2)}), N = ${r.n}.`).join(' ')}`;
      break;
    }
    case 'desc_categorical': {
      summaryItems([['變量數', R.vars.length]]);
      rt.innerHTML = R.tables.map(t=>`
        <h4>${t.var}（N=${t.total}）</h4>
        ${tableHTML(['Category','Count','%'], t.rows.map(r=>[r.value, r.count, r.pct]))}`).join('');
      ri.innerHTML = R.tables.map(t=>{
        const top = t.rows[0];
        return `<p><b>${t.var}</b>：共 ${t.total} 例，最多為 <code>${top.value}</code>（${top.count}, ${fmt(top.pct,1)}%）。</p>`;
      }).join('');
      mr.textContent = R.tables.map(t=> `${t.var} (N = ${t.total}): `+ t.rows.map(r=>`${r.value} = ${r.count} (${fmt(r.pct,1)}%)`).join('; ') + '.').join('\n');
      break;
    }
    case 'ttest_one': {
      summaryItems([['N',R.n],['Mean',fmt(R.mean)],['SD',fmt(R.sd)],['t',fmt(R.t,3)],['df',R.df],['p',pStr(R.p)]]);
      rt.innerHTML = tableHTML(['Statistic','Value'], [
        ['Test value μ₀', R.mu0],['Mean', R.mean],['Mean − μ₀', R.mean - R.mu0],
        ['SD', R.sd],['t', R.t],['df', R.df],['p', R.p],
        ['95% CI (mean)', `[${fmt(R.ci[0])}, ${fmt(R.ci[1])}]`]
      ]);
      ri.innerHTML = `<p>樣本均值 ${fmt(R.mean)}（SD=${fmt(R.sd)}, n=${R.n}）${R.p<0.05?'顯著':'未顯著'}地${R.mean>R.mu0?'高於':'低於'}檢驗值 ${R.mu0}（t(${R.df})=${fmt(R.t,3)}, p=${pStr(R.p)}）。</p>`;
      mr.textContent = `A one-sample t-test was conducted to compare ${R.variable} against the test value ${R.mu0}. The sample mean (M = ${fmt(R.mean,2)}, SD = ${fmt(R.sd,2)}, n = ${R.n}) was${R.p<0.05?'':' not'} significantly different from ${R.mu0}, t(${R.df}) = ${fmt(R.t,2)}, p = ${pStr(R.p)}.`;
      break;
    }
    case 'ttest_ind': {
      summaryItems([['Group A',`${R.groupA} (n=${R.sa.n})`],['Group B',`${R.groupB} (n=${R.sb.n})`],
        ['Mean Diff',fmt(R.meanDiff)],['t',fmt(R.t,3)],['df',fmt(R.df,2)],['p',pStr(R.p)]]);
      rt.innerHTML = tableHTML(['Group','N','Mean','SD'], [
        [R.groupA, R.sa.n, R.sa.mean, R.sa.sd],
        [R.groupB, R.sb.n, R.sb.mean, R.sb.sd]
      ]) + tableHTML(['Statistic','Value'],[
        ['Mean difference', R.meanDiff],['SE', R.se],
        ['t', R.t],['df (Welch)', R.df],['p (two-tailed)', R.p]
      ]);
      ri.innerHTML = `<p>${R.groupA} 組均值 ${fmt(R.sa.mean)}（SD=${fmt(R.sa.sd)}）vs ${R.groupB} 組 ${fmt(R.sb.mean)}（SD=${fmt(R.sb.sd)}）。差值=${fmt(R.meanDiff)}，t(${fmt(R.df,2)})=${fmt(R.t,3)}，p=${pStr(R.p)}，${R.p<0.05?'差異具統計學意義':'差異無統計學意義'}。</p>`;
      mr.textContent = `An independent-samples t-test (Welch) was conducted to compare ${R.y} between ${R.groupA} (M = ${fmt(R.sa.mean,2)}, SD = ${fmt(R.sa.sd,2)}, n = ${R.sa.n}) and ${R.groupB} (M = ${fmt(R.sb.mean,2)}, SD = ${fmt(R.sb.sd,2)}, n = ${R.sb.n}). The difference was${R.p<0.05?'':' not'} significant, t(${fmt(R.df,2)}) = ${fmt(R.t,2)}, p = ${pStr(R.p)}.`;
      break;
    }
    case 'ttest_paired': {
      summaryItems([['n pairs',R.n],['Mean diff',fmt(R.mean)],['SD diff',fmt(R.sd)],['t',fmt(R.t,3)],['df',R.df],['p',pStr(R.p)]]);
      rt.innerHTML = tableHTML(['Statistic','Value'],[
        ['n (pairs)', R.n],['Mean of differences', R.mean],['SD of differences', R.sd],
        ['t', R.t],['df', R.df],['p', R.p]
      ]);
      ri.innerHTML = `<p>${R.a} 與 ${R.b} 的平均差為 ${fmt(R.mean)}（SD=${fmt(R.sd)}, n=${R.n}），t(${R.df})=${fmt(R.t,3)}，p=${pStr(R.p)}，${R.p<0.05?'差異顯著':'差異不顯著'}。</p>`;
      mr.textContent = `A paired-samples t-test was conducted on ${R.a} and ${R.b}. The mean difference was ${fmt(R.mean,2)} (SD = ${fmt(R.sd,2)}), t(${R.df}) = ${fmt(R.t,2)}, p = ${pStr(R.p)}.`;
      break;
    }
    case 'anova': {
      summaryItems([['Groups',R.k],['N',R.N],['F',fmt(R.F,3)],['df',`${R.dfB}, ${R.dfW}`],['p',pStr(R.p)],['η²',fmt(R.eta2,3)]]);
      rt.innerHTML = tableHTML(['Group','N','Mean','SD'], R.desc.map(d=>[d.group,d.n,d.mean,d.sd])) +
        tableHTML(['Source','SS','df','MS','F','p'],[
          ['Between', R.ssB, R.dfB, R.msB, R.F, R.p],
          ['Within',  R.ssW, R.dfW, R.msW, '', ''],
          ['Total', R.ssB+R.ssW, R.dfB+R.dfW, '', '', '']
        ]);
      ri.innerHTML = `<p>${R.k} 組（總 N=${R.N}）的均值差異 ${R.p<0.05?'具':'不具'}統計學顯著性，F(${R.dfB}, ${R.dfW})=${fmt(R.F,3)}，p=${pStr(R.p)}，效應量 η²=${fmt(R.eta2,3)}（${R.eta2<0.06?'小':R.eta2<0.14?'中':'大'} 效應）。${R.p<0.05?'建議進一步進行事後檢驗（如 Tukey HSD）以識別具體組間差異。':''}</p>`;
      mr.textContent = `A one-way ANOVA was conducted to compare ${R.y} across ${R.k} groups of ${R.g}. There was${R.p<0.05?' a':' no'} significant effect, F(${R.dfB}, ${R.dfW}) = ${fmt(R.F,2)}, p = ${pStr(R.p)}, η² = ${fmt(R.eta2,3)}.`;
      break;
    }
    case 'chisq': {
      summaryItems([['χ²',fmt(R.chi2,3)],['df',R.df],['p',pStr(R.p)],['N',R.N]]);
      const head = ['',...R.colsLabels,'Total'];
      const body = R.observed.map((row,i)=>[R.rowsLabels[i], ...row, R.rowSums[i]]);
      body.push(['Total', ...R.colSums, R.N]);
      rt.innerHTML = '<h4>觀察頻數（Observed）</h4>' + tableHTML(head, body) +
        '<h4>期望頻數（Expected）</h4>' + tableHTML(['',...R.colsLabels],
          R.expected.map((row,i)=>[R.rowsLabels[i], ...row]));
      const lowExp = R.expected.flat().filter(v=>v<5).length;
      ri.innerHTML = `<p>${R.a} × ${R.b} 列聯表的卡方獨立性檢驗：χ²(${R.df}) = ${fmt(R.chi2,3)}，p=${pStr(R.p)}，${R.p<0.05?'拒絕獨立性假設，兩變量存在關聯':'未能拒絕獨立性假設'}。${lowExp>0?`<br><span style="color:#b94a4a;">⚠ 有 ${lowExp} 個期望頻數 &lt; 5，建議使用 Fisher 精確檢驗。</span>`:''}</p>`;
      mr.textContent = `A chi-square test of independence was performed to examine the relationship between ${R.a} and ${R.b}. The relationship was${R.p<0.05?'':' not'} significant, χ²(${R.df}, N = ${R.N}) = ${fmt(R.chi2,2)}, p = ${pStr(R.p)}.`;
      break;
    }
    case 'mw': {
      summaryItems([['n₁',R.n1],['n₂',R.n2],['U',fmt(R.U,1)],['z',fmt(R.z,3)],['p',pStr(R.p)]]);
      rt.innerHTML = tableHTML(['Statistic','Value'],[
        [`${R.groupA} (n₁)`, R.n1],[`${R.groupB} (n₂)`, R.n2],
        ['U', R.U],['Z', R.z],['p (two-tailed)', R.p]
      ]);
      ri.innerHTML = `<p>${R.groupA} 與 ${R.groupB} 兩組分布${R.p<0.05?'存在':'未見'}顯著差異（Mann-Whitney U=${fmt(R.U,1)}，Z=${fmt(R.z,3)}，p=${pStr(R.p)}）。</p>`;
      mr.textContent = `A Mann–Whitney U test indicated${R.p<0.05?'':' no'} significant difference in ${R.y} between ${R.groupA} (n = ${R.n1}) and ${R.groupB} (n = ${R.n2}), U = ${fmt(R.U,1)}, Z = ${fmt(R.z,2)}, p = ${pStr(R.p)}.`;
      break;
    }
    case 'kw': {
      summaryItems([['Groups',R.k],['N',R.N],['H',fmt(R.H,3)],['df',R.df],['p',pStr(R.p)]]);
      rt.innerHTML = tableHTML(['Group','N','Median','IQR'], R.desc.map(d=>[d.group, d.n, d.median, `${fmt(d.q1)}–${fmt(d.q3)}`])) +
        tableHTML(['Statistic','Value'],[['H', R.H],['df', R.df],['p', R.p]]);
      ri.innerHTML = `<p>Kruskal-Wallis 檢驗：H(${R.df})=${fmt(R.H,3)}，p=${pStr(R.p)}，${R.p<0.05?'各組分布存在差異':'各組分布無顯著差異'}。${R.p<0.05?'建議使用 Dunn 檢驗進行事後兩兩比較。':''}</p>`;
      mr.textContent = `A Kruskal–Wallis H test showed${R.p<0.05?' a':' no'} statistically significant difference in ${R.y} across ${R.k} groups, H(${R.df}) = ${fmt(R.H,2)}, p = ${pStr(R.p)}.`;
      break;
    }
    case 'wsr': {
      summaryItems([['n',R.n],['W',fmt(R.W,1)],['z',fmt(R.z,3)],['p',pStr(R.p)]]);
      rt.innerHTML = tableHTML(['Statistic','Value'],[['n (non-zero)',R.n],['W+', R.Wp],['W−', R.Wn],['W', R.W],['Z', R.z],['p', R.p]]);
      ri.innerHTML = `<p>${R.a} 與 ${R.b} 的配對差異 ${R.p<0.05?'顯著':'不顯著'}（Wilcoxon W=${fmt(R.W,1)}，Z=${fmt(R.z,3)}，p=${pStr(R.p)}）。</p>`;
      mr.textContent = `A Wilcoxon signed-rank test of ${R.a} vs ${R.b} yielded${R.p<0.05?'':' no'} significant difference, W = ${fmt(R.W,1)}, Z = ${fmt(R.z,2)}, p = ${pStr(R.p)}, n = ${R.n}.`;
      break;
    }
    case 'correlation': {
      summaryItems([['Method',R.method],['Variables',R.vars.length]]);
      const head = ['', ...R.vars];
      const body = R.matrix.map((row,i)=>[
        R.vars[i],
        ...row.map((c,j)=> i===j ? '1.000' : `${fmt(c.r,3)}${c.p<0.05 && i!==j ? '*':''}\n(p=${pStr(c.p)})`)
      ]);
      rt.innerHTML = `<h4>相關矩陣（${R.method==='pearson'?'Pearson r':'Spearman ρ'}, * p<0.05）</h4>` + tableHTML(head, body);
      // pairwise list
      const pairs = [];
      for(let i=0;i<R.vars.length;i++) for(let j=i+1;j<R.vars.length;j++){
        const c = R.matrix[i][j];
        pairs.push(`<li><b>${R.vars[i]} ↔ ${R.vars[j]}</b>: r=${fmt(c.r,3)}, p=${pStr(c.p)}（${Math.abs(c.r)<0.1?'極弱':Math.abs(c.r)<0.3?'弱':Math.abs(c.r)<0.5?'中':Math.abs(c.r)<0.7?'強':'極強'}${c.r>0?'正':'負'}相關）</li>`);
      }
      ri.innerHTML = `<ul>${pairs.join('')}</ul>`;
      mr.textContent = `${R.method==='pearson'?'Pearson':'Spearman'} correlation coefficients were calculated. ` +
        (function(){
          const lines=[];
          for(let i=0;i<R.vars.length;i++) for(let j=i+1;j<R.vars.length;j++){
            const c=R.matrix[i][j];
            lines.push(`${R.vars[i]} and ${R.vars[j]}: r = ${fmt(c.r,2)}, p = ${pStr(c.p)}`);
          }
          return lines.join('; ')+'.';
        })();
      break;
    }
    case 'linear': {
      summaryItems([['N',R.n],['R²',fmt(R.r2,4)],['Adj R²',fmt(R.adjR2,4)],
        ['F',fmt(R.F,3)],['df',`${R.fDf[0]}, ${R.fDf[1]}`],['Model p',pStr(R.fP)]]);
      const body = R.names.map((n,i)=>[n, R.coef[i], R.se[i], R.t[i], R.p[i]]);
      rt.innerHTML = '<h4>係數估計</h4>' + tableHTML(['Variable','Estimate','Std. Error','t','p'], body, {pCol:4}) +
        '<h4>模型摘要</h4>' + tableHTML(['Statistic','Value'],[
          ['R²', R.r2],['Adjusted R²', R.adjR2],
          ['F-statistic', R.F],['F df', `${R.fDf[0]}, ${R.fDf[1]}`],
          ['Model p-value', R.fP],['Residual SE', Math.sqrt(R.mse)],
          ['n', R.n]
        ]);
      ri.innerHTML = `<p>模型整體顯著性：F(${R.fDf[0]}, ${R.fDf[1]})=${fmt(R.F,3)}，p=${pStr(R.fP)}；R²=${fmt(R.r2,3)}（解釋了因變量 ${fmt(R.r2*100,1)}% 的變異）。</p>` +
        '<ul>' + R.names.slice(1).map((n,i)=>{
          const idx=i+1; const sig = R.p[idx]<0.05?'<b style="color:#c9a961;">顯著</b>':'不顯著';
          return `<li><b>${n}</b>：β=${fmt(R.coef[idx],3)}，SE=${fmt(R.se[idx],3)}，t=${fmt(R.t[idx],2)}，p=${pStr(R.p[idx])}（${sig}）</li>`;
        }).join('') + '</ul>';
      mr.textContent = `A multiple linear regression was conducted to predict ${R.y} from ${R.xs.join(', ')}. ` +
        `The model was${R.fP<0.05?'':' not'} significant, F(${R.fDf[0]}, ${R.fDf[1]}) = ${fmt(R.F,2)}, p = ${pStr(R.fP)}, R² = ${fmt(R.r2,3)}, Adjusted R² = ${fmt(R.adjR2,3)}. ` +
        R.names.slice(1).map((n,i)=>`${n}: β = ${fmt(R.coef[i+1],2)}, SE = ${fmt(R.se[i+1],2)}, t = ${fmt(R.t[i+1],2)}, p = ${pStr(R.p[i+1])}`).join('; ') + '.';
      break;
    }
    case 'logistic': {
      summaryItems([['N',R.n],['Iter',R.iter],['LR χ²',fmt(R.lr,3)],['LR p',pStr(R.lrP)],['Pseudo R²',fmt(R.pseudoR2,3)]]);
      const body = R.names.map((n,i)=>[n, R.coef[i], R.se[i], R.z[i], R.p[i],
        i===0 ? '—' : `${fmt(R.or[i],3)} [${fmt(R.orCI[i][0],3)}, ${fmt(R.orCI[i][1],3)}]`]);
      rt.innerHTML = '<h4>係數估計</h4>' + tableHTML(['Variable','β','SE','Z','p','OR (95% CI)'], body, {pCol:4}) +
        '<h4>模型擬合</h4>' + tableHTML(['Statistic','Value'],[
          ['Log-likelihood', R.ll],['Null LL', R.ll0],
          ['LR χ²', R.lr],['df', R.lrDf],['LR p', R.lrP],
          ['McFadden Pseudo R²', R.pseudoR2],['Iterations', R.iter],
          ['Converged', R.converged?'Yes':'No']
        ]);
      ri.innerHTML = `<p>整體似然比檢驗：χ²(${R.lrDf})=${fmt(R.lr,3)}，p=${pStr(R.lrP)}，${R.lrP<0.05?'模型優於空模型':'模型未顯著優於空模型'}；McFadden Pseudo R²=${fmt(R.pseudoR2,3)}。</p>` +
        '<ul>' + R.names.slice(1).map((n,i)=>{
          const idx=i+1, or=R.or[idx];
          return `<li><b>${n}</b>：β=${fmt(R.coef[idx],3)}（OR=${fmt(or,3)}, 95% CI ${fmt(R.orCI[idx][0],3)}–${fmt(R.orCI[idx][1],3)}），p=${pStr(R.p[idx])}。${n} 每增加 1 個單位，結局發生的勝算${or>1?'升高':'降低'} ${fmt(Math.abs(or-1)*100,1)}%。</li>`;
        }).join('') + '</ul>';
      mr.textContent = `A binary logistic regression predicting ${R.y} from ${R.xs.join(', ')} was conducted (n = ${R.n}). The overall model was${R.lrP<0.05?'':' not'} significant, LR χ²(${R.lrDf}) = ${fmt(R.lr,2)}, p = ${pStr(R.lrP)}, McFadden's R² = ${fmt(R.pseudoR2,3)}. ` +
        R.names.slice(1).map((n,i)=>`${n}: OR = ${fmt(R.or[i+1],2)} (95% CI ${fmt(R.orCI[i+1][0],2)}–${fmt(R.orCI[i+1][1],2)}), p = ${pStr(R.p[i+1])}`).join('; ') + '.';
      break;
    }
    case 'cox': {
      summaryItems([['N',R.n],['Events',R.events],['Iter',R.iter],['Converged',R.converged?'Yes':'No']]);
      const body = R.names.map((n,i)=>[n, R.coef[i], R.se[i], R.z[i], R.p[i],
        `${fmt(R.hr[i],3)} [${fmt(R.hrCI[i][0],3)}, ${fmt(R.hrCI[i][1],3)}]`]);
      rt.innerHTML = tableHTML(['Variable','β','SE','Z','p','HR (95% CI)'], body, {pCol:4});
      ri.innerHTML = '<ul>' + R.names.map((n,i)=>{
        const hr=R.hr[i];
        return `<li><b>${n}</b>：HR=${fmt(hr,3)}（95% CI ${fmt(R.hrCI[i][0],3)}–${fmt(R.hrCI[i][1],3)}），p=${pStr(R.p[i])}。${n} 每增加 1 個單位，事件風險${hr>1?'升高':'降低'} ${fmt(Math.abs(hr-1)*100,1)}%。</li>`;
      }).join('') + '</ul>';
      mr.textContent = `A Cox proportional hazards regression with ${R.events} events among ${R.n} observations was performed (Breslow method for ties). ` +
        R.names.map((n,i)=>`${n}: HR = ${fmt(R.hr[i],2)} (95% CI ${fmt(R.hrCI[i][0],2)}–${fmt(R.hrCI[i][1],2)}), p = ${pStr(R.p[i])}`).join('; ') + '. The proportional hazards assumption should be verified separately (e.g., Schoenfeld residuals).';
      break;
    }
    case 'ts': {
      summaryItems([['N',R.n],['Mean',fmt(R.summary.mean,3)],['Trend β',fmt(R.trend.coef[1],4)],
        ['Trend p',pStr(R.trend.p[1])],['AR(1) φ',fmt(R.ar1.coef[1],3)],['Ljung-Box p',pStr(R.ljungBox.p)]]);
      rt.innerHTML = '<h4>線性趨勢</h4>' + tableHTML(['Term','Estimate','SE','t','p'],
          R.trend.names.map((n,i)=>[n, R.trend.coef[i], R.trend.se[i], R.trend.t[i], R.trend.p[i]]), {pCol:4}) +
        '<h4>AR(1) 模型：x_t = c + φ·x_{t-1}</h4>' + tableHTML(['Term','Estimate','SE','t','p'],
          R.ar1.names.map((n,i)=>[n, R.ar1.coef[i], R.ar1.se[i], R.ar1.t[i], R.ar1.p[i]]), {pCol:4}) +
        '<h4>自相關係數 ACF</h4>' + tableHTML(['Lag','r'], R.acf.map(a=>[a.lag, a.r])) +
        '<h4>Ljung-Box 檢驗</h4>' + tableHTML(['Statistic','Value'],
          [['Q', R.ljungBox.Q],['df', R.ljungBox.df],['p', R.ljungBox.p]]);
      ri.innerHTML = `<p>序列共 ${R.n} 個觀測。線性趨勢項 β=${fmt(R.trend.coef[1],4)}，p=${pStr(R.trend.p[1])}，${R.trend.p[1]<0.05?'存在顯著線性趨勢':'未見顯著線性趨勢'}。</p>` +
        `<p>AR(1) 自迴歸係數 φ=${fmt(R.ar1.coef[1],3)}（p=${pStr(R.ar1.p[1])}），${Math.abs(R.ar1.coef[1])>0.5?'存在較強的一階自相關':'一階自相關較弱'}。</p>` +
        `<p>Ljung-Box Q(${R.ljungBox.df})=${fmt(R.ljungBox.Q,3)}，p=${pStr(R.ljungBox.p)}，${R.ljungBox.p<0.05?'拒絕「序列為白噪聲」的假設，存在顯著自相關結構':'未拒絕白噪聲假設'}。</p>`;
      mr.textContent = `A time-series analysis of ${R.variable} (n = ${R.n}) was conducted. ` +
        `Linear trend: β = ${fmt(R.trend.coef[1],3)}, p = ${pStr(R.trend.p[1])}. ` +
        `AR(1) coefficient φ = ${fmt(R.ar1.coef[1],2)}, p = ${pStr(R.ar1.p[1])}. ` +
        `Ljung–Box test for residual autocorrelation: Q(${R.ljungBox.df}) = ${fmt(R.ljungBox.Q,2)}, p = ${pStr(R.ljungBox.p)}.`;
      break;
    }
  }
}

/* ===================== 11. EXPORT ===================== */
function exportCSV(){
  const R = State.result;
  if(!R){ showToast('沒有可下載的結果'); return; }
  let csv = '';
  const add = (rows) => { csv += rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')+'\n\n'; };

  csv += `# ${METHOD_INFO[R.kind]?.[0] || R.kind} - Hughie's Online Lab\n`;
  csv += `# ${new Date().toISOString()}\n\n`;

  switch(R.kind){
    case 'desc_continuous':
      add([['Variable','N','Mean','SD','SE','Median','Q1','Q3','Min','Max']]);
      R.table.forEach(r=> add([[r.var,r.n,fmt(r.mean),fmt(r.sd),fmt(r.se),fmt(r.median),fmt(r.q1),fmt(r.q3),fmt(r.min),fmt(r.max)]]));
      break;
    case 'desc_categorical':
      R.tables.forEach(t=>{
        csv += `# ${t.var} (N=${t.total})\n`;
        add([['Category','Count','Percent']]);
        t.rows.forEach(r=> add([[r.value,r.count,fmt(r.pct,2)+'%']]));
      });
      break;
    case 'ttest_one': case 'ttest_ind': case 'ttest_paired':
    case 'mw': case 'kw': case 'wsr':
    case 'anova': case 'chisq':
      add([['Statistic','Value']]);
      Object.entries(R).filter(([k])=>['t','df','p','F','H','U','W','Z','chi2','meanDiff','mean','sd','n'].includes(k))
        .forEach(([k,v])=> add([[k,fmt(v)]]));
      break;
    case 'correlation':
      add([['', ...R.vars]]);
      R.matrix.forEach((row,i)=> add([[R.vars[i], ...row.map(c=>fmt(c.r,4))]]));
      csv += '\n# p-values\n';
      add([['', ...R.vars]]);
      R.matrix.forEach((row,i)=> add([[R.vars[i], ...row.map(c=>pStr(c.p))]]));
      break;
    case 'linear':
      add([['Variable','Estimate','SE','t','p']]);
      R.names.forEach((n,i)=> add([[n,fmt(R.coef[i]),fmt(R.se[i]),fmt(R.t[i]),pStr(R.p[i])]]));
      csv += `\n# Model: R²=${fmt(R.r2,4)}, Adj R²=${fmt(R.adjR2,4)}, F=${fmt(R.F,3)}, p=${pStr(R.fP)}\n`;
      break;
    case 'logistic':
      add([['Variable','β','SE','Z','p','OR','OR_low','OR_high']]);
      R.names.forEach((n,i)=> add([[n,fmt(R.coef[i]),fmt(R.se[i]),fmt(R.z[i]),pStr(R.p[i]),
        i===0?'-':fmt(R.or[i]), i===0?'-':fmt(R.orCI[i][0]), i===0?'-':fmt(R.orCI[i][1])]]));
      csv += `\n# LR χ²=${fmt(R.lr,3)}, df=${R.lrDf}, p=${pStr(R.lrP)}, McFadden R²=${fmt(R.pseudoR2,4)}\n`;
      break;
    case 'cox':
      add([['Variable','β','SE','Z','p','HR','HR_low','HR_high']]);
      R.names.forEach((n,i)=> add([[n,fmt(R.coef[i]),fmt(R.se[i]),fmt(R.z[i]),pStr(R.p[i]),
        fmt(R.hr[i]), fmt(R.hrCI[i][0]), fmt(R.hrCI[i][1])]]));
      break;
    case 'ts':
      csv += '# Linear Trend\n';
      add([['Term','Estimate','SE','t','p']]);
      R.trend.names.forEach((n,i)=> add([[n,fmt(R.trend.coef[i]),fmt(R.trend.se[i]),fmt(R.trend.t[i]),pStr(R.trend.p[i])]]));
      csv += '\n# AR(1) Model\n';
      add([['Term','Estimate','SE','t','p']]);
      R.ar1.names.forEach((n,i)=> add([[n,fmt(R.ar1.coef[i]),fmt(R.ar1.se[i]),fmt(R.ar1.t[i]),pStr(R.ar1.p[i])]]));
      csv += '\n# ACF\n';
      add([['Lag','r']]);
      R.acf.forEach(a=> add([[a.lag,fmt(a.r)]]));
      csv += `\n# Ljung-Box Q=${fmt(R.ljungBox.Q,3)}, df=${R.ljungBox.df}, p=${pStr(R.ljungBox.p)}\n`;
      break;
  }

  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `analysis-${R.kind}-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  showToast('結果已下載為 CSV');
}

function copyReport(){
  const text = [
    'Method: ' + (METHOD_INFO[State.result?.kind]?.[0] || ''),
    '',
    document.getElementById('methodReport').textContent,
    '',
    document.getElementById('resultInterpret').innerText
  ].join('\n');
  navigator.clipboard.writeText(text).then(()=>showToast('已複製到剪貼板'));
}

/* ===================== 12. EVENT BINDING ===================== */
document.addEventListener('DOMContentLoaded', () => {
  // wizard nav
  document.getElementById('nextBtn').addEventListener('click', ()=>{
    if(validateStep(currentStep)) showStep(Math.min(currentStep+1, TOTAL_STEPS));
  });
  document.getElementById('prevBtn').addEventListener('click', ()=> showStep(Math.max(currentStep-1, 1)));
  document.getElementById('runBtn').addEventListener('click', runAnalysis);
  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if(confirm('確定要清空所有選擇嗎？')){
      document.getElementById('analysisForm').reset();
      State.data = null; State.analysis = null; State.result = null;
      document.getElementById('dataPreview').innerHTML='';
      document.getElementById('csvPaste').value='';
      showStep(1);
    }
  });

  // step indicator click
  document.querySelectorAll('.progress-steps .step').forEach(el=>{
    el.addEventListener('click', ()=>{
      const target = +el.dataset.step;
      if(target < currentStep) showStep(target);
    });
  });

  // file upload
  document.getElementById('csvFile').addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => { document.getElementById('csvPaste').value = ev.target.result; loadData(ev.target.result); };
    reader.readAsText(f, 'utf-8');
  });
  // paste change
  document.getElementById('csvPaste').addEventListener('input', e=>{
    if(e.target.value.trim()) loadData(e.target.value);
  });
  // sample data
  document.querySelectorAll('input[name="sample"]').forEach(r=>{
    r.addEventListener('change', e=>{
      const txt = SAMPLES[e.target.value];
      document.getElementById('csvPaste').value = txt;
      loadData(txt);
    });
  });

  // export buttons
  document.getElementById('downloadBtn').addEventListener('click', exportCSV);
  document.getElementById('copyBtn').addEventListener('click', copyReport);

  // initial
  showStep(1);
});
