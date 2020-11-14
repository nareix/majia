const NODE_TYPE = (()=>{
  const create = 'create';
  const rename = 'rename';
  const close = 'close';
  const label = 'label';
  return {
    create,
    rename,
    close,
    label,
  }
})();

const DATA_NODE=(()=>{
  let map = {};
  for( let key in NODE_TYPE){
    map[key] = `data-node="${NODE_TYPE[key]}"`;
  }
  return map;
})();

const buildHtml = function({
  list,
  activeId = 1,
  }){
  return tmpCont( tmpList( list, activeId ), tmpToolbar(list.length) );
};

var tmpCont = function( list, toolbar ){
  return `
<div>
  ${list}
  ${toolbar}
</div>
`
};

// 列表
var tmpList = function( list, activeId){
  return `
<table class="list">
  ${
    list.map( item=>{
      let isActive = item.id == activeId;
      return `
      <tr data-id="${item.id}" ${isActive ? 'class="active"': ''}>
        <td>
          <label ${DATA_NODE.label}>
            <input type="radio" name="majia" ${isActive? 'checked': ''}>
            ${item.title}
          </label>
        </td>
        <td>
          ${isActive ? `<a class="close" ${DATA_NODE.close} title="Delete">&times;</a>`: ''}
        </td>
      </tr>
      `
    }).join('')
  }
</table>
`
};

var tmpToolbar = function( listLen ){
  return `
<div class="toolbar">
  <button ${DATA_NODE.create}>+</button>
  ${listLen > 1 ? `<button ${DATA_NODE.rename}>Rename</button>` : ''}
</div>
  `
};

var tmpRenameInput = function(){
  return `
<input type="text">
  `
};