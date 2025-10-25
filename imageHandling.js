// Image handling functions
function hideAllImages() {
    const hongElements = document.querySelector('.gamjeom-container-left');
    const chongElements = document.querySelector('.gamjeom-container-right');
    if (hongElements) {
        const img = hongElements.querySelector('.action-image');
        const ref = hongElements.querySelector('.referee-name');
        if (img) img.style.display = 'none';
        if (ref) ref.style.display = 'none';
    }
    if (chongElements) {
        const img = chongElements.querySelector('.action-image');
        const ref = chongElements.querySelector('.referee-name');
        if (img) img.style.display = 'none';
        if (ref) ref.style.display = 'none';
    }
}

function showImage(container, image, refereeName, timeout) {
    if (!image || !container) return;
    
    const imgElement = container.querySelector('.action-image');
    const refElement = container.querySelector('.referee-name');
    
    if (imgElement) {
        imgElement.src = image;
        imgElement.style.display = 'block';
    }
    
    if (refElement && refereeName) {
        refElement.textContent = `Referee: ${refereeName}`;
        refElement.style.display = 'block';
    }
    
    if (timeout) {
        setTimeout(() => {
            hideAllImages();
        }, timeout);
    }
}
