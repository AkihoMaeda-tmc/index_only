/* CONFIG */
// 状態や設定値の格納
const CONFIG = {
  Init: function(_sizechange){
    CONFIG.$.sizechange = _sizechange; 
  },
  $: {
    sizechange: {}
  },
  // 一括更新:ウィジェットパラメータ
  style: {
    width: {
      change: 0.2,
      default: 140
    },
    fontSize: {
      default: 7,
      list: [10,12,14,18,24,36,48,64,80,144,288,999]
    }
  }
};

/* UTIL */
// 共通処理（ユーティリティ）の格納
const UTIL = {
  get: {
    Id: async function(_id){
      const result = await miro.board.widgets.get({id:_id});
      return result;
    },
    FontSize: function fontsize(_num,_change){
      const arr = CONFIG.style.fontSize.list;
      const indexof = arr.indexOf(_num);
      
      if(indexof > 0) { 
        return Math.min(Math.max(
          indexof + _change
        , 0), 10); 
      } else {
        return Math.min(Math.max(
          arr.findIndex(function(_value){
            return (_num < _value);
          }) - 1 + _change
        , 0), 10);
        
      }
    }
  },
  // 更新する対象のシェイプやスタイル判定
  check: {
    Obj: function(_target){
      return (
        _target.style.shapeType === 3 &&
        _target.style.backgroundColor === "#d3d3d3"
        );
    },
    Aspect: function(_target){
      return (
        _target.width < _target.height
        );
    }
  }
};

/* UPDATE */
// 変更処理の格納
const UPDATE = {
  width: {
    Recommend: function(){
      // miro.showNotification('記号幅: width / Recommend');
      UPDATE.Styles('width');
    },
    Up: function(){
      // miro.showNotification('記号幅: width / Up');
      UPDATE.Styles('width',1);
    },
    Down: function(){
      // miro.showNotification('記号幅: width / Down');
      UPDATE.Styles('width',-1);
    },
  },
  font: {
    Recommend: function(){
      // miro.showNotification('文字サイズ: fontSize / Recommend');
      UPDATE.Styles('fontSize');
    },
    Up: function(){
      // miro.showNotification('文字サイズ: fontSize / Up');
      UPDATE.Styles('fontSize',1);
    },
    Down: function(){
      // miro.showNotification('文字サイズ: fontSize / Down');
      UPDATE.Styles('fontSize',-1);
    },
  },
  Styles: async function(type,_change){
    
    const change = _change || false;
    
    const selectionWidgets = await miro.board.selection.get(); // 選択しているウィジェットの取得
    let updatedWidgetsData = []; // 更新したウィジェットのコンソール確認用データ
    
    // 選択しているウィジェットデータの有無確認
    if(!selectionWidgets.length){
      return false;
    }
    
    // console.time(type,change);
    
    //更新処理
    updatedWidgetsData = await Promise.all(
      selectionWidgets.map(async function(widget){
        let updatedWidget = [false];
        // 更新対象判定
        if(UTIL.check.Obj(widget)){
          
          const updateStyles = {};
          
          // 一括更新条件(推奨値)と更新する対象の条件が一致するウィジェットは処理しない
          const flgWidth =    change? true: widget.width !== CONFIG.style.width.default;
          const flgFontSize = change? true: widget.style.fontSize !== CONFIG.style.fontSize.list[CONFIG.style.fontSize.default];
          
          // 更新値決定
          switch(type){
            case 'fontSize':
              if(!flgFontSize){return false} 
              updateStyles.style = Object.assign(widget.style,{fontSize:CONFIG.style.fontSize.list[(
                change
                ? UTIL.get.FontSize(widget.style.fontSize, change)
                : CONFIG.style.fontSize.default  // 推奨値
              )]})
              break;
            case 'width':
              if(!flgWidth){return false}
              if(!UTIL.check.Aspect(widget)){return false}
              updateStyles.width = change
                ? widget.width + (widget.width * CONFIG.style.width.change * change)
                : CONFIG.style.width.default  // 推奨値
                ;
              break;
            }
          
          // 更新
          updatedWidget = await miro.board.widgets.update({
            id: widget.id, // 更新に必要なウィジェットID
            text: widget.text, // textを更新元ウィジェットから設定しないと削除されるので注意
            style: updateStyles.style,
            width: updateStyles.width
          });
        }
        return updatedWidget[0];
      })
    );
    // console.timeEnd(type,change); // 更新処理時間計測 : end
    
    // 更新したウィジェットのコンソール確認：更新していないウィジェットは削除（集計に含めない）
    // console.log("更新したウィジェット", updatedWidgetsData.filter(Boolean));
  }
};

/* miro.onReady */
// メイン処理開始
miro.onReady(async function(){
  
  // console.log(await miro.board.info.get());
  
  // // CONFIGを初期化
  const sizechange = document.getElementById('size-change')
  CONFIG.Init(sizechange);
  
  // 一括変更処理
  selectionWidgetsUpdate();
  
});

async function selectionWidgetsUpdate() {
  const type1 = ['width','font'], type2 = ['Recommend','Up','Down'];

  type1.map((T1)=>{
    type2.map((T2)=>{
      // ボタンにクリック処理を追加
      miro.board.ui.initDraggableItemsContainer(CONFIG.$.sizechange, {
        draggableItemSelector: `.button-small.${T1}.${T2.toLowerCase()}`,
        onClick: () => {
          UPDATE[T1][T2]();
        }
      })
    });
  });
}
