// Handle opening and closing of the info overlay
const infoOverlay = document.getElementById('info-overlay');
const openInfoButton = document.getElementById('btn-open-info');
const closeInfoButton = document.getElementById('btn-close-info');

openInfoButton.addEventListener('click', () => infoOverlay.classList.add('active'));
closeInfoButton.addEventListener('click', () => infoOverlay.classList.remove('active'));
infoOverlay.addEventListener('click', (e) => {
  if(e.target === infoOverlay) infoOverlay.classList.remove('active');
});

// Image comparision widget logic
document.addEventListener('DOMContentLoaded', () => {
  const compWidgets = document.querySelectorAll('.img-comparision-widget');

  compWidgets.forEach(widget => {
    
    const slider = widget.querySelector('.img-comp-slider');
    const overlayImg = widget.querySelector('.img-comp-overlay');
    const sliderHandle = widget.querySelector('.slider-handle');

    if (!slider || !overlayImg || !sliderHandle) return;

    function updateSlider() {
      const val = slider.value;
      
      // Remove clip overlay image to match slider value
      overlayImg.style.clipPath = `inset(0 ${100 - val}% 0 0)`;
      // Move handle to match slider value      
      sliderHandle.style.left = `${val}%`;
    }

    slider.addEventListener('input', updateSlider);
    updateSlider();
  });
});
