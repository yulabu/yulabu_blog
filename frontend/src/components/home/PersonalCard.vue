<template>
  <div class="card">
    <div class="card-top">
      <div class="image"></div>
    </div>
    <div class="card-bottom">
      <h2 class="name">Yulabu</h2>
      <span>记录学习，分享生活。</span>
    </div>
    <div class="card-bottom2">
      <div class="joker-image"></div>
      <span class="joker-text">Hey？</span>
    </div>
  </div>
</template>
<style scoped>
.card{
  position: relative;
  width: 300px;
  height: 260px;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
  border-top: 1px solid white;
  border-left: 1px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border-radius: 0 0 30px 30px;
}
.card-top{
  position: relative;
  width: 330px;
  height: 130px;
  background-color: rgba(167, 233, 186, .85);
  display: flex;
  justify-content: center;
  align-items: center;
  transition:  .5s;
}
/* 裁剪小三角 */
.card-top::after{
  content: '';
  position: absolute;
  width: 40px;
  height: 40px;
  background-color: rgba(167, 233, 186, .85);
  transition: translate(-50%);
  /* left: 50%; */
  bottom: -30%;
  clip-path: polygon(50% 40%,0 0,100% 0);
  z-index: 9;
}
.image{
  position: absolute;
  top: 20px;
  width: 90px;
  height: 90px;
  background-image: url('@/assets/img/Personal_img.jpg');
  background-size: cover;
  border: 5px solid rgb(139, 194, 155);;
  transition: .5s;
}
.card-bottom, .card-bottom2{
  position: absolute;
  top: 150px;
  width: 100%;
  height: 130px;
  text-align: center;
  transition: .5s;
}
.card-bottom h2{
  display: block;
  margin: 10px 0 10px 0;
  font: 800 28px "Hobo Std";
}
.card-bottom span{
  /* display: block; */
  font-size: 400 24px 'Giddyup Std';
  color: rgb(100, 100, 100);
}
.card-bottom h2::after{
  content: "";
  display: block;
  width: 200px;
  height: 2px;
  background-color: black;
  position: absolute;
  left: 50%;
  transform: translate(-50%, 4px);
}
.card-bottom2{
  top: 300px;
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.joker-image {
  width: 160px;
  height: 160px;
  flex-shrink: 0;
  border-radius: 50%;
  background-image: url('@/assets/img/personal_joker.jpg');
  background-size: cover;
  background-position: center;
}

.joker-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}
/* 鼠标移入动画实现 */
.card:hover .card-top{
  height: 50px;
}
.card:hover .image{
  width: 35px;
  height: 35px;
  border-width: 3px;
  transform: translate(-140px,-15px);
}
.card:hover .card-bottom{
  top: 300px;
}
.card:hover .card-bottom2{
  top: 50px;
}

</style>