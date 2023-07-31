function scrollUp() {
  document.getElementById("scrollUp").addEventListener("click", function () {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  });

  window.onscroll = function () {
    if (
      document.body.scrollTop > 100 ||
      document.documentElement.scrollTop > 100
    ) {
      document.getElementById("scrollUp").style.display = "block";
    } else {
      document.getElementById("scrollUp").style.display = "none";
    }
  };
}
scrollUp();

function getYear() {
  document.getElementById("year").textContent = new Date().getFullYear();
}
getYear();