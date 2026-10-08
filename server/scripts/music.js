// 统一引导：模块别名 + 环境变量 + 进程级未处理异常兜底（见 server/bootstrap.js）
require('../bootstrap');
const { playlistIds } = require('@config/music');
const { getPlaylists, getTrackStream } = require('@services/music');

// 音乐歌单的手工入口（部署后验证与排障）：打印配置的歌单、逐首解析结果，并抽验直链 CDN 可达。
//
//   node scripts/music.js                  按本机所在地区解析（即不带 X-Real-IP）
//   node scripts/music.js --ip=223.5.5.5   以指定 IP 充当 X-Real-IP（模拟大陆访客）
//
// 注意：服务器在境外时，不带 --ip 会让版权曲目显示「地区受限」——那是**预期行为**
// （真实链路里 X-Real-IP 是访客自己的 IP），别据此判定功能坏了。
async function probe(url) {
  // 只取前 1KB：顺带验证 Range 支持（播放器拖进度条要用），不下载整首
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(8000) });
    await res.arrayBuffer();
    return `HTTP ${res.status}`;
  } catch (err) {
    return `异常(${err.message})`;
  }
}

if (require.main === module) {
  (async () => {
    const ipArg = process.argv.find((arg) => arg.startsWith('--ip='));
    const realIp = ipArg ? ipArg.slice('--ip='.length) : undefined;

    if (!playlistIds.length) {
      console.log('未配置 NETEASE_PLAYLIST_IDS（见 server/.env），音乐功能当前关闭');
      return;
    }

    const playlists = await getPlaylists();
    for (const playlist of playlists) {
      console.log(`歌单「${playlist.name}」(${playlist.id})：${playlist.trackCount} 首，取到 ${playlist.tracks.length} 首${realIp ? `，X-Real-IP=${realIp}` : ''}`);
      let playable = 0;
      for (const [index, track] of playlist.tracks.entries()) {
        const label = `  ${String(index + 1).padStart(2)}. ${track.name} - ${track.artists.join('/')} (fee=${track.fee}) → `;
        try {
          const stream = await getTrackStream(track.id, { realIp });
          if (stream.playable) {
            playable += 1;
            console.log(`${label}可播 ${stream.level}/${stream.br}bps | CDN ${await probe(stream.url)}`);
          } else {
            console.log(`${label}不可播（${stream.reason}）`);
          }
        } catch (err) {
          console.log(`${label}解析失败：${err.message}`);
        }
      }
      console.log(`  小结：可播 ${playable}/${playlist.tracks.length}`);
    }
  })().catch((err) => {
    console.error('[music] 失败:', err.message);
    process.exit(1);
  });
}
