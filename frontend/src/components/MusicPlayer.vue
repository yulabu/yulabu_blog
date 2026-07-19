<template>
  <div class="card">
    <div class="cover">
      <img src="../../assets/img/music_player.jpg" alt="">
    </div>
    <div class="info">
      <div class="title">title</div>
      <div class="singer">singer</div>
    </div>
    <div class="volume-box">
      <span class="volume-down">
        <i class="icons">-</i>
      </span>
      <input type="range" class="volume-range" step="1" value="80" min="0" max="100">
      <span class="volume-up">
        <i class="icons">+</i>
      </span>
    </div>
    <div class="btn-box">
      <i>stop</i>
    </div>
    <div class="music-box">
      <input type="range" class="seekbar" step="1" value="0" min="0" max="100">
      <audio src="../../assets/music/我爱你 - nxd.mp3"></audio>
      <span class="current-time"></span>
      <span class="duration"></span>
      <span class="play">
      </span>
    </div>
  </div>
</template>
<style scoped>
  .card{
    z-index: 9;
    width: 100%;
    height: auto;
    padding: 36px;
    border-radius: 5%;
    box-shadow: 0 10px  30px black;
    border-top: 1px solid white;
    border-left: 1px solid white;
    background: linear-gradient(to right bottom,
        rgba(255, 255, 255, .6),
        rgba(255, 255, 255, .3),
        rgba(255, 255, 255, .2));
    backdrop-filter: blur(16px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

  } 
  .cover{
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    /* border-radius: 5px; */
  }
  .cover img{
    width: 100%;
    display: block;
    object-fit: cover;
    object-position: top;
  }
  .card input[type=range]{
  }
</style>