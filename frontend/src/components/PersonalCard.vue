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
      <ul>
        <li>QQ:1458661453</li>
        <li>WX:yulabu_nxd</li>
        <li>GitHub:yulabu</li>
      </ul>
    </div>
  </div>
</template>
<style scoped>
/* 调试暂用大小，后面记得改成相对 */
.card{
  position: relative;
  width: 300px;
  height: 260px;
  background-color: rgb(234, 248, 236);
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  overflow: hidden;
  border-radius: 0 0 30px 30px;
}
.card-top{
  position: relative;
  width: 330px;
  height: 130px;
  background-color: rgb(167, 233, 186);
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
  background-color: rgb(167, 233, 186);
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
  background-image: url('../../assets/img/Personal_img.jpg');
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
  height: 30%;
}
.card-bottom2 li{
  margin: 26px 0;
  font: 800 24px 'OCR A Std';
  text-align: center;
  transition: .2s;
}
ul{
  list-style: none;
  padding: 0;
  margin: 0;
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
li:hover{
  color: rgb(87, 228, 191);
  transform: translateY(-10px);
}
</style>