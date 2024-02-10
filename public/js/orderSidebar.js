let Hamburger = document.getElementById('account-sidebar');
let sidebar = document.getElementById('drawer-left-example');
let sidebarCloseButton = document.getElementById('sidebar-close-button')

Hamburger.addEventListener('click',() => {
    sidebar.style.display = 'flex'
    sidebar.style.flexDirection = 'column'
})
sidebarCloseButton.addEventListener('click',() => {
    sidebar.style.display = 'none'
})