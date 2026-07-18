<template>
  <div class="card">
    <header>
      <div class="day">18</div>
      <div class="month">July</div>
    </header>
    <table class="calender">
      <thead>
        <tr>
          <th>Sun</th>
          <th>Mon</th>
          <th>Tue</th>
          <th>Wed</th>
          <th>Thu</th>
          <th>Fri</th>
          <th>Sat</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="pre-month">29</td>
          <td class="pre-month">30</td>
          <td>1</td>
          <td>2</td>
          <td>3</td>
          <td>4</td>
          <td>5</td>
        </tr>
        <tr>
          <td>6</td>
          <td>7</td>
          <td>8</td>
          <td>9</td>
          <td>10</td>
          <td>11</td>
          <td>12</td>
        </tr>
        <tr>
          <td>13</td>
          <td>14</td>
          <td>15</td>
          <td>16</td>
          <td>17</td>
          <td class="current-day">18</td>
          <td>19</td>
        </tr>
        <tr>
          <td>20</td>
          <td>21</td>
          <td>22</td>
          <td>23</td>
          <td>24</td>
          <td>25</td>
          <td>26</td>
        </tr>
        <tr>
          <td>27</td>
          <td>28</td>
          <td>29</td>
          <td>30</td>
          <td>31</td>
          <td class="next-month">1</td>
          <td class="next-month">2</td>
        </tr>
      </tbody>
  </table>
  <div class="ring-left"></div>
  <div class="ring-right"></div>
  </div>
  
</template>
<!-- 本组件样式继承整体页面的分配的大小，单用要改宽度 -->
<style scoped>
  .card{
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%; 
    height: auto;
    background-color: rgb(234, 248, 236);
    box-shadow: 0 19px 38px rgba(0,0,0,0.2);
    overflow: hidden;
    border-radius: 0 0 30px 30px;
  }
  header{
    position: relative;
    width: 100%;
    height: 160px;
    background-color: rgb(167, 233, 186);
    color: rgb(130, 226, 216);
    display: flex;
    padding: 30px 20px;
    background-size: cover;
    background-image: url(../assets/img/calender.jpg);
  }
  .day{
    font-size: 36px;
    font-weight: bold;
    margin-right: 10px;
    text-transform: uppercase;
  }
  .month{
    font-size: 30px;
    font-weight: bold;
    margin-top: 8px;
  }
  .calender{
    position: relative;
    margin-top: auto;
    width: 100%;
    height: auto;
    text-align: center;
    border-collapse: collapse;
    padding: 10px;
  }
  .calender thead{
    font-size: 14px;
    color: rgb(130, 226, 216);
  }
  .calender th, .calender td{
    border-radius: 36%;
    text-align: center;
    font: 600 17px;
    padding: 16px 0;
  }
  .calender td:hover{
    color: rgb(80, 140, 134);
    background-color: rgb(181, 199, 186);
    font:600 23px;
  }
  .current-day{
    color: rgb(80, 140, 134);
    font:600 23px;
  }
  .pre-month,
  .next-month{
    color: rgb(130, 226, 216);
  }
  .ring-left:before, .ring-right:before{
    position: absolute;
    top: 55%;
  }
  .ring-left{
    left: 2px;
  }
  .ring-right{
    right: 2px;
  }
  .ring-left:before, .ring-right:before{
    content: "";
    width: 8px;
    height: 32px;
    margin: 8px;
    border-radius: 4px;
    background:#fff;
    box-shadow: 0 3px 1px rgba(0,0,0,0.2),0 -1px 1px rgba(0,0,0,0.2);
    display: inline-block;

  }
</style>
<script setup>
// 时间尚未实现
</script>