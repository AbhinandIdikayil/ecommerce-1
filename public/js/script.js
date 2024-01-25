    let hover = document.getElementById('hover-div');
    let hover2 =document.getElementById('hover-div-2');
    let men = document.getElementById('men');
    let women = document.getElementById('women')
    let mainHover = document.getElementsByClassName('hover')[0];
    men.addEventListener('mouseover',() => {
        mainHover.style.display = 'flex'
        hover.style.display = 'flex';
        
        hover2.style.display = 'none'
        
    })
    hover.addEventListener('mouseleave',()=> {
        
        hover.style.display='none';
    })



    // for women catogerois hover

    women.addEventListener('mouseover',() => {
        mainHover.style.display = 'flex'
        hover.style.display='none';
        hover2.style.display = 'flex'
    })
    hover2.addEventListener('mouseleave',() => {
        
        hover2.style.display = 'none'
    })


// for carousel
