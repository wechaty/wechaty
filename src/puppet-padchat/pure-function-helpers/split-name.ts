export function splitChineseNameList(nameListText: string): string[] {
  // 李卓桓、李佳芮、桔小秘
  return nameListText.split('、')
}

export function splitEnglishNameList(nameListText: string): string[] {
  // Zhuohuan, 太阁_传话助手, 桔小秘
  return nameListText.split(', ')
}
