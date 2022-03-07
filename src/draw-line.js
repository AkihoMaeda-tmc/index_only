/* CONFIG */
// 状態や設定値の格納
const CONFIG = {
  Init: function(_container){
    CONFIG.$.container = _container;
    
  },
  mode: {
    line: 0,
    line_text: ['OFF','ON'],
  },
  $: {
    button: {},
    container: {}
  },
  click: {
    ids: [],
    widgets: []
  },
  color: {
    black: '#000'
  }
};

/* UTIL */
// 共通処理（ユーティリティ）の格納
const UTIL = {
  get: {
    Id: async function(_id){
      const result = await miro.board.widgets.get({id:_id});
      return result;
    }
  },
  set: {
    $: {
      Button: function(){
        return CONFIG.$.button = CONFIG.$.container.querySelector('.mode-change');
      }
    }
  },
  clear: {
    Click: function(){
      CONFIG.click.ids = [];
      CONFIG.click.widgets = [];
      console.groupEnd();
    }
  },
  Mode: function(){
    CONFIG.mode.line = (CONFIG.mode.line +1) % 2;
    
    return CONFIG.mode.line;
  },
  // 更新する対象のシェイプやスタイル判定
  check: {
    Obj: function(_target){
      return (
        _target.style.shapeType === 3 &&
        _target.style.backgroundColor === "#d3d3d3"
        );
    }
  }
};

/* miro.onReady */
// メイン処理開始
miro.onReady(async function(){
  
  console.log(await miro.board.info.get());
  
  // CONFIGを初期化
  const container = document.getElementById('container')
  CONFIG.Init(container);
  
  // 左メニューにボタン追加
  LeftSideBarAdd();
  
  // ウィジェットの操作イベントリスナー追加
  WidgetAction();
  
});
  
/* function LeftSideBarAdd */
// 左メニューにボタン追加
async function LeftSideBarAdd(){
  CONFIG.$.container =document.getElementById('toggle-frame')
  
  // ON/OFFで使うのでCONFIGに格納
  UTIL.set.$.Button();
  
  // ボタンにクリック処理を追加
  miro.board.ui.initDraggableItemsContainer(CONFIG.$.container, {
    draggableItemSelector: '.toggle.mode-change',
    onClick: () => {
      UTIL.Mode();
      miro.showNotification('物の流れ線描写モード: ' + CONFIG.mode.line_text[CONFIG.mode.line]);
    }
  })
  
}

/* function WidgetAction */
// ウィジェットの操作イベントリスナー追加
async function WidgetAction(){
  const CID = miro.getClientId();
  console.group('-- plugin started --');
  
  /* addListener CANVAS_CLICKED */
  // キャンバスがクリックされた時の処理追加
  // なお、右⇔左のクリック種別は判別不可。用意されていない
  miro.addListener('CANVAS_CLICKED',async function(E,I){
    if(!CONFIG.mode.line ){ return false; }
    console.group('-- CANVAS_CLICKED --');
    
    // 選択されているオブジェクトを取得
    const sel = await miro.board.selection.get();
    
    // 選択されているものによって処理分岐
    switch(!!sel.length && sel[0].type){
      
      //何も選択されていない時
      case false:
        console.log('clicked: Nothing...')
        SelActionNothing();
        break;
        
      //接続線が選択されているとき
      // case 'LINE':
      //   console.log('clicked: '+ sel[0].type)
      //   console.log('Not 工程オブジェクト')
      //   SelActionLine(sel[0]);
      //   break;

      // SHAPEだったとき
      case 'SHAPE':
        console.log('clicked: '+ sel[0].type);
        
        // 工程オブジェクト以外を選択したとき⇒処理終了
        if(!UTIL.check.Obj(sel[0])){
          console.log('Not 工程オブジェクト')
          console.groupEnd();
          SelActionElse();
          return false;
        }
        
        SelActionWidget(sel[0]);
        break;
        
      // それ以外の時（接続線追加対象）
      default:
        console.log('clicked: '+ sel[0].type)
        console.log('Not 工程オブジェクト')
        SelActionElse();
        break;
    }
    
  });
  
  /* function SelActionNothing */
  //何も選択されていない時 function
  async function SelActionNothing(target){
    if(CONFIG.click.ids.length >  0){
      miro.showNotification('選択状態のオブジェクトがありません。<br>⇒連続選択クリア');
    }
    UTIL.clear.Click();
  }
  
  /* function SelActionLine */
  //接続線が選択されているとき function
  // async function SelActionLine(target){
  //   miro.showNotification('接続線がクリックされました。<br>⇒連続選択クリア');
  //   UTIL.clear.Click();
  // }

  /* function SelActionElse */
  //工程オブジェクト以外が選択されているとき function
  async function SelActionElse(target){
    miro.showNotification('工程以外がクリックされました。');
    // UTIL.clear.Click();
  }
    
  /* function SelActionWidget */
  // それ以外の時（接続線追加対象） function
  async function SelActionWidget(target){
    // 二回連続で同じオブジェクトを選択したとき⇒処理終了
    if(
      CONFIG.click.ids[0] === target.id
    ){
      console.groupEnd();
      return false;
    }
    
    // 選択履歴に格納（ID、オブジェクト）
    CONFIG.click.ids.unshift(target.id);
    CONFIG.click.widgets.unshift(target);
    
    console.log(target);
    
    // 選択が一つ目だった時（前工程）⇒後工程を促し処理終了
    if(
      CONFIG.click.ids.length < 2
    ){
      miro.showNotification('前工程が選択されました。<br>後工程を選択してください。');
      console.groupEnd();
      return false;
    }
    
    // 選択オブジェクトの矩形情報
    // 接続線の位置を調整するのに使用する可能性
    const bounds0 = CONFIG.click.widgets[0].bounds;
    const bounds1 = CONFIG.click.widgets[1].bounds;
    
    // 接続線追加
    const line = (await miro.board.widgets.create({
      type: 'line',
      bounds: {
        y: 50
      },
      startWidgetId:CONFIG.click.ids[1],
      startPosition: {
        x: bounds1.right,
        y: bounds1.top
      },
      endWidgetId:CONFIG.click.ids[0],
      endPosition: {
        x: bounds0.right,
        y: bounds0.top
      },
      captions: 'test',
      style: {
        lineColor:      CONFIG.color.black,
        lineThickness:  10,
        lineStartStyle: miro.enums.lineArrowheadStyle.NONE,
        lineEndStyle:   miro.enums.lineArrowheadStyle.FILLED_ARROW,
        lineStyle:      miro.enums.lineStyle.NORMAL,
        lineType:       0
      },
      metadata: {
        [CID]: {
          time: Date.now(),
          num: Math.random()*10
          
        }
      }
    }))[0];
    
    miro.showNotification('接続線を追加しました。');
    
    // 選択履歴をリセット
    UTIL.clear.Click();
    
    // 選択状態を解除
    await miro.board.selection.clear();
    
    
    /* 
    await miro.board.widgets.update({
     id:line.id,
     style: {
       lineColor: '#c00'
     }
    });
     */
  }
    
  
}
  