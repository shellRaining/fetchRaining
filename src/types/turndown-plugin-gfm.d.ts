declare module 'turndown-plugin-gfm' {
  import TurndownService from 'turndown';

  // 插件导出的实际是一个对象，里面通常有 { gfm, tables, strikethrough, taskListItems }
  // 这里我们给一个比较宽松但有点类型信息的声明：

  export function gfm(service: TurndownService): void;
  export function tables(service: TurndownService): void;
  export function strikethrough(service: TurndownService): void;
  export function taskListItems(service: TurndownService): void;
}
