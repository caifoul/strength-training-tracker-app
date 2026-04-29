(function () {
  if (!localStorage.getItem('strengthTrackerAuth')) {
    window.location.replace('signup.html');
  }
})();
