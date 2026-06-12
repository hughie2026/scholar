// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Search bar (placeholder behavior)
const searchInput = document.querySelector('.hero-search input');
const searchBtn = document.querySelector('.hero-search button');
if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const q = (searchInput.value || '').trim().toLowerCase();
    if (!q) {
      document.getElementById('modules').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (q.includes('nutrition') || q.includes('營養') || q.includes('营养')) {
      window.location.href = 'nutrition-assessment.html';
    } else {
      alert('暫未找到相關工具，更多模塊正在開發中。');
    }
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBtn.click();
  });
}
