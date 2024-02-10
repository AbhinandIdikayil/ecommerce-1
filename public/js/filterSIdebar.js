
let button = document.getElementById('filter-sidebar-button');
let div = document.getElementById('drawer-left-example')
let closeButton = document.getElementById('sidebar-close-button');

closeButton.addEventListener('click',() => {
    div.style.display = 'none'
})

button.addEventListener('click',() => {
    div.style.display = 'flex'
    div.style.flexDirection = 'column'
})