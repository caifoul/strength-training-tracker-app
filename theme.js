(function () {
  const t = localStorage.getItem('constantiaTheme') || 'dark';
  document.documentElement.dataset.theme = t;
}());
