async function init() {
	// ボタンクリックでイベント
	document.getElementById("Select_only_Process").addEventListener("click", rangeSelection, false);
	// document.getElementById("Exclude_only_Process").addEventListener("click", rangeSelection, false);

	async function rangeSelection(btn) {
		// 選択されているオブジェクトを配列で取得
		const selectionObject = await miro.board.selection.get();
		if(selectionObject){
			// オブジェクトを格納する変数（工程シェイプかそれ以外か）を用意する
			let objectList = [];
			let objectExcludeList = [];
			// オブジェクト配列を一つずつ確認
			Object.keys(selectionObject).forEach(function(key){
				const thisObject = selectionObject[key];
				// 工程シェイプかどうかを判断し、それぞれの変数にオブジェクトIDを追加
				if(
					thisObject.style.shapeType === 3 &&
					thisObject.style.backgroundColor === "#d3d3d3"
				){
					objectList.push(thisObject.id);
				}else{
					objectExcludeList.push(thisObject.id);
				}
			});
			// // [工程]を除外の場合はリストを入れ替え
			// if(btn.target.id == 'Exclude_only_Process'){
			// 	objectList = objectExcludeList;
			// }
			// 一旦選択を全て外す
			miro.board.selection.clear();
			// リスト化されたIDのオブジェクトを選択
			miro.board.selection.selectWidgets(objectList);
    }
  }
}
miro.onReady(init);