const modal = document.getElementById('myModal');
const btn = document.getElementById('openModalBtn');
const span = document.getElementsByClassName('close')[0];

btn.onclick = function () {
    modal.style.display = 'block';
    setTimeout(function () {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

span.onclick = function () {
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.opacity = '0';
    setTimeout(function () {
        modal.style.display = 'none';
    }, 300);
}

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.opacity = '0';
        setTimeout(function () {
            modal.style.display = 'none';
        }, 300);
    }
}