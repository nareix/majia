var Util = {
  isClassName( selector ){
    if( selector && typeof selector === 'string' ){
      selector = selector.trim();
      if( selector.charAt(0) === '.'){
        return true;
      }
    }
    return false;// 标签名
  },

  parent( el, selector ){
    let isClass = this.isClassName( selector );
    let p = el.parentNode;
    let tag = p.tagName.toLowerCase();
    while( tag !== 'body' ){
      if( isClass ? p.classList.contains(selector) : (tag === selector) ){
        break;
      }
      else{
        p = p.parentNode;
        tag = p.tagName.toLowerCase();
      }
    }
    if( tag === 'body'){
      return null;
    }
    else{
      return p;
    }
  },
};