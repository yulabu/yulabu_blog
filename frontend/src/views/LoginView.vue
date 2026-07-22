<template>
      <section class="login-page">
        <div class="color1">
            <div class="bubble-img" style="--j:0"></div>
            <div class="bubble-img" style="--j:1"></div>
            <div class="bubble-img" style="--j:2"></div>
        </div>
        <div class="color2">
            <div class="bubble-img" style="--j:0"></div>
            <div class="bubble-img" style="--j:1"></div>
            <div class="bubble-img" style="--j:2"></div>
        </div>
        <div class="color3">
            <div class="bubble-img" style="--j:0"></div>
            <div class="bubble-img" style="--j:1"></div>
            <div class="bubble-img" style="--j:2"></div>
        </div>
        <div class="box">
            <div class="container">  
                <div class="square" style="--i:0;"></div>
                <div class="square" style="--i:1;"></div>
                <div class="square" style="--i:2;"></div>
                <div class="square" style="--i:3;"></div>
                <div class="square" style="--i:4;"></div>
                <div class="square" style="--i:5;"></div>
                <div class="left-img"></div>  
                <div class="form">
                    <h2>Login Form</h2>
                    <form @submit.prevent="handleLogin">
                        <div class="inputBox">
                            <input type="text" placeholder="Username" v-model.trim="admin_name">
                        </div>
                        <div class="inputBox">
                            <input type="password" placeholder="Password" v-model="admin_password">
                        </div>
                        <div class="inputBox">
                            <input type="submit" value="Login">
                        </div>
                    </form>
                    <p v-if="loginError" class="error">{{ loginError }}</p>
                </div>
                
            </div>

        </div>
    </section>
</template>

<style scoped>
.login-page{
    width: 100vw;
    height: 100vh;
    position: relative;
    background: url('../assets/img/background_0.png') no-repeat center / cover;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
/* Background Colors */
section{
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    /* background: rgba(241, 244, 249, 0.2);  */
}
section .color1{
    position: absolute;
    opacity: 0.7;
    width: 36%;
    height: 36%;
    background: transparent;
    top: 0%;
    right: 16%;
    isolation: isolate; 
    z-index: 0;
}
section .color1::before{
    content: '';
    position: absolute;
    top: -20%;           /* 向上扩大 200px */
    left: -20%;          /* 向左扩大 200px */
    width: calc(120%);  /* 总宽度增加 400px */
    height: calc(120%); /* 总高度增加 400px */
    background: #81d8af;
    filter: blur(8.33vw); 
    z-index: -1;           /* 放在图片下方 */
}
section .color2{
    position: absolute;
    opacity: 0.7;
    width: 36%;
    height: 36%;
    background: transparent;
    bottom: 16%;
    left: 0%;
    isolation: isolate; 
    z-index: 0;
}
section .color2::before{
    content: '';
    position: absolute;
    bottom: -36%;           /* 向上扩大 200px */
    left: -20%;          /* 向左扩大 200px */
    width: calc(120%);  /* 总宽度增加 400px */
    height: calc(136%); /* 总高度增加 400px */
    background: #a1d881;
    filter: blur(8.33vw); 
    z-index: -1;           /* 放在图片下方 */
}
section .color3{
    position: absolute;
    opacity: 0.7;
    width: 36%;
    height: 36%;
    background: transparent;
    bottom: 6%;
    left: 64%;
    isolation: isolate; 
    z-index: 0;
}
section .color3::before{
    content: '';
    position: absolute;
    top: -20%;       
    left: -20%;          /* 向左扩大 200px */
    width: calc(120%);  /* 总宽度增加 400px */
    height: calc(120%); /* 总高度增加 400px */
    background: #87dc8b;
    filter: blur(8.33vw);  
    z-index: -1;           /* 放在图片下方 */
}
/* color img bubble */
.bubble-img{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    /* mix-blend-mode: overlay; */
    pointer-events: none;
    filter: blur(1px);
    /* 羽化蒙版 */
    mask-image: radial-gradient(circle at center,
        rgba(255, 255, 255, 1) 15%,
        rgba(255, 255, 255, 0) 40%);
    -webkit-mask-image: radial-gradient(circle at center,
                rgba(255,255,255,1) 15%, 
                rgba(255,255,255,0) 40%);
    mask-size: 240% 240%;
    -webkit-mask-size: 240% 240%;
    mask-position: center;
    -webkit-mask-position: center;
    clip-path: inset(0 round 30px);
    animation: cycleBubble 18s ease-in-out infinite; 
    animation-delay: calc(6s * var(--j));
    /* priority */
    z-index: 0;
}
/* 色块1 的三张图 */
.color1 .bubble-img:nth-child(1) { background-image: url('assets/img/nxd_bubble1_1.png'); }
.color1 .bubble-img:nth-child(2) { background-image: url('assets/img/nxd_bubble1_2.jpg'); }
.color1 .bubble-img:nth-child(3) { background-image: url('assets/img/nxd_bubble1_3.jpg'); }

/* 色块2 的两张图 */
.color2 .bubble-img:nth-child(1) { background-image: url('assets/img/nxd_bubble2_1.jpg'); }
.color2 .bubble-img:nth-child(2) { background-image: url('assets/img/nxd_bubble2_2.jpg'); }
.color2 .bubble-img:nth-child(3) { background-image: url('assets/img/nxd_bubble2_3.jpg'); }
/* 色块3 的三张图 */
.color3 .bubble-img:nth-child(1) { background-image: url('assets/img/nxd_bubble3_1.jpg'); }
.color3 .bubble-img:nth-child(2) { background-image: url('assets/img/nxd_bubble3_2.jpg'); }
.color3 .bubble-img:nth-child(3) { background-image: url('assets/img/nxd_bubble3_3.jpg'); }
@keyframes cycleBubble {
    0%   { opacity: 0; transform: translateY(100%); }
    11.11% { opacity: 1; transform: translateY(30%);}   /* 淡入结束 */
    33.33% { opacity: 1; transform: translateY(0%);}   /* 显示结束 */
    44.44% { opacity: 0; transform: translateY(-30%);}   /* 淡出结束 */
    100%  { opacity: 0; transform: translateY(-100%);}    /* 保持隐藏 */
}
/* Container Style */
.container{
    position: relative;
    display: flex;
    width: 900px;
    height: 520px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
    box-shadow: 0 25px 45px rgba(0, 0, 0, 0.1);
    /* 自定义容器边框 体现立体感 */
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
/* login box style */
.box{
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
}
.box .left-img{
    position: relative;
    top: 0;
    left: 0px;
    width: 35%;
    height: 100%;
    background-image: url('assets/img/login_left.jpg');
    background-size: cover;
    border-radius: 10px;
    z-index: 3;
}
.box .square{
    position: absolute;
    background: rgba(255, 255, 255, 0.1);

    border: 1px solid rgba(255, 255, 255, 0.5);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(5px);
    border-radius: 10px;
    /* annimation demo */
    animation: animate 8s linear infinite;
    animation-delay: calc(-1s * var(--i));
}
@keyframes animate{
    0%,100%{
        transform: translateY(-40px);
    }
    50%{
        transform: translateY(40px);
     }
}
.container .square:nth-child(1){
    top: -50px;
    left: 648px;
    width: 120px;
    height: 120px;
    z-index: 4;
}
.container .square:nth-child(2){
    top: 120px;
    left: -100px;
    width: 150px;
    height: 150px;
    z-index: 4;
}
.container .square:nth-child(3){
    top: 360px;
    left: 150px;
    width: 125px;
    height: 125px;
    z-index: 4;
}
.container .square:nth-child(4){
    top: -75px;
    left: 100px;
    width: 64px;
    height: 64px;
    z-index: 4;
}
.container .square:nth-child(5){
    top: 560px;
    left: 540px;
    width: 64px;
    height: 64px;
    z-index: 4;
}
.container .square:nth-child(6){
    top: 320px;
    left: 824px;
    width: 150px;
    height: 150px;
    z-index: 4;
}
.form{
    position: relative;
    width: 65%;
    height: 100%;
    padding: 40px;
    display: flex;
    padding: 40px 56px;
    flex-direction: column;
    justify-content: center;
}
.form h2{
    position: relative;
    color: #fff;
    font-size: 30px;
    font-weight: 600;
    letter-spacing: 1px;
    margin-bottom: 40px;
} 
.form h2::before{
    content: '';
    position: absolute;
    left: 0;
    bottom: -10px;
    width: 80px;
    height: 4px;
    background: #fff;
}
.form .inputBox{
    position: relative;
    width: 100%;
    margin-top: 20px;
}
.form .inputBox input{
    width: 100%;
    padding: 12px 16px;   /* ↑↓ 控制“高度感”，←→ 控制文字左右呼吸 */
    font-size: 16px;      /* 字大一点，输入也更清楚 */
    border: none;
    background: rgba(255, 255, 255, 0.2);
    margin-bottom: 16px;
    border-radius: 35px;  
    outline: none;
    color: #fff;
    /* 自定义容器边框 体现立体感 */
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);

    font-size: 16px;
    letter-spacing: 1px;
    
}
.form .inputBox input::placeholder{
    color: #fff;
}
.form .inputBox input[type="submit"]{
    background: #fff;
    color: #666;
    max-width: 100px;
    font-weight: 600;
    margin-bottom: 20px;
    cursor: pointer;
    transition: 0.3s ease;
}
/* ==================== 移动端适配（改动最小方案） ==================== */

/* 当屏幕宽度小于等于 768px 时（手机/小平板） */
@media screen and (max-width: 830px) {
    .box .square:nth-child(2),
    .box .square:nth-child(3),
    .box .square:nth-child(5),
    .box .square:nth-child(6) {
        display: none;
    }
    /* 保留两个小方块作为点缀，并调整位置 */
    .box .square:nth-child(1) {
        top: -30px;
        left: auto;
        right: 20px;
        width: 70px;
        height: 70px;
    }
    .box .square:nth-child(4) {
        top: auto;
        bottom: -30px;
        left: 20px;
        width: 50px;
        height: 50px;
    }

    /* 2. 容器变窄，改为纵向排列，高度自适应 */
    .container {
        width: 88%;
        max-width: 440px;
        min-height: auto;          /* 取消固定高度 */
        flex-direction: column;    /* 改为上下排列 */
        padding: 20px;
    }

    /* 3. 左侧图片隐藏（手机上没必要显示） */
    .box .left-img {
        display: none;
    }

    /* 4. 表单区域占满宽度，内边距减小 */
    .form {
        width: 100%;
        padding: 24px 20px;
    }
    .form h2 {
        font-size: 26px;
        margin-bottom: 32px;
    }
    .form h2::before {
        width: 60px;
        height: 3px;
    }
    .form .inputBox input {
        font-size: 15px;
        padding: 10px 14px;
    }
    .form .inputBox input[type="submit"] {
        max-width: 100%;   /* 按钮撑满 */
        font-size: 17px;
    }
}
.error {
    color: #ff6b6b;
    margin-top: 10px;
    font-size: 14px;
}
</style>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const admin_name = ref('')
const admin_password = ref('')
const loginError = ref('')
const router = useRouter()

async function handleLogin() {
  loginError.value = ''
  if (!admin_name.value || !admin_password.value) {
    loginError.value = '请输入用户名和密码'
    return
  }
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_name: admin_name.value,
        admin_password: admin_password.value,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '登录失败')
    localStorage.setItem('token', data.token)
    router.push('/admin')
  } catch (e) {
    loginError.value = e.message
  }
}
</script>
