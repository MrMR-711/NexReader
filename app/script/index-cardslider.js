const slider = document.querySelector('.card-slider');
const items = document.querySelectorAll('.card-item');

let index = 0;
let auto = true;

function autoSlide() {
    if (!auto) return;

    index++;
    if (index >= items.length) index = 0;

    slider.scrollTo({
        left: items[index].offsetLeft,
        behavior: 'smooth'
    });
}

setInterval(autoSlide, 4000);

slider.addEventListener('touchstart', () => auto = false);
slider.addEventListener('mousedown', () => auto = false);