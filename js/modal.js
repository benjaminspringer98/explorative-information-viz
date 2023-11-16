const modal = document.getElementById('myModal');
const btn = document.getElementById('openModalBtn');
const span = document.getElementsByClassName('close')[0];

btn.onclick = function () {
    showModal();
}

span.onclick = function () {
    hideModal();
}

window.onclick = function (event) {
    if (event.target === modal) {
        hideModal();
    }
}

function showModal() {
    modal.style.display = 'block';
    setTimeout(function () {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

function hideModal() {
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.opacity = '0';
    setTimeout(function () {
        modal.style.display = 'none';
    }, 300);
}