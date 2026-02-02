
// Minimal v4 loader (fallback)
document.getElementById('btn-load-sample').onclick=()=>{localStorage.setItem('SAMPLE',JSON.stringify(window.SAMPLE_DATA)); location.reload();};
