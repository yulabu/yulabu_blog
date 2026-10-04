/** qrcode 包无自带类型；本站只使用 create() 取二维码模块矩阵（圆点码由
 *  composables/useSharePoster.ts 从矩阵自绘，禁用该包的默认渲染器），此处只声明
 *  用到的最小 API 面。 */
declare module 'qrcode' {
  interface QRCodeModules {
    /** 模块边长（N×N 矩阵） */
    size: number
    /** 行优先的 0/1 位图，长度 = size * size */
    data: Uint8Array
  }
  interface QRCode {
    modules: QRCodeModules
  }
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H' }
  ): QRCode
}
