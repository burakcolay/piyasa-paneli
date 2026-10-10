import { shell, loadDay, fail, esc, startLive } from '../app.js';
import { earningsBlock, openCompany, setLive } from '../earnings.js';

async function main() {
  const ctx = await loadDay();
  const D = ctx.data;
  const app = shell('hisseler');
  app.innerHTML = `<div class="wrap narrow">
    <a class="small" href="hisseler.html">← ABD hisseleri</a>
    <section class="card lead">
      <span class="eyebrow accent">Bilanço takvimi</span>
      <h1 class="page-h">NQ devlerinin bilançoları</h1>
      <p class="muted">Nasdaq 100'ü en çok oynatan sekiz şirketin sıradaki bilanço tarihleri. Bir şirkete tıkla: beklentiler, bilançoda neye bakılacağı, son bilançonun sürprizi, gelir dağılımı ve analist görüşleri açılır.</p>
    </section>
    <section class="card"><div class="earn-list">${earningsBlock(D.nq?.earnings, D.date)}</div>
      <span class="xs muted">Kapanış sonrası açıklanan bilançoda ilk tepki gece seansında gelir; NQ ertesi sabah boşluklu açılabilir.</span></section>
    <p class="source">Takvim günlük rutinle güncellenir (Bigdata.com). Yatırım tavsiyesi değildir.</p>
  </div>`;
  if (!ctx.isOld) startLive(setLive);
  app.addEventListener('click', (e) => { const r = e.target.closest('.earn[data-tk]'); if (r) openCompany(r.dataset.tk); });
  app.addEventListener('keydown', (e) => { const r = e.target.closest?.('.earn[data-tk]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCompany(r.dataset.tk); } });
}
main().catch(fail);
