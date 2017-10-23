var reloadCurrentTab = function () {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.reload(tabs[0].id);
	});
};

var reloadPopup = function () {
	// window.location.reload();
	initPage();
};

var callApi = function (op, params) {
	return new Promise(function (fulfill, reject) {
		params = params || {};

		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var url = new URL( tabs[0].url );
			params.host = url.host;

			chrome.runtime.sendMessage(null, {op: op, params: params}, {}, fulfill);
		});
	});
};

var selectProfile = function (id) {
	callApi('selectProfile', {id: id}).then(function () {
		reloadCurrentTab();
		reloadPopup();
	});
};

var newProfile = function () {
	callApi('newProfile').then(function () {
		reloadCurrentTab();
		reloadPopup();
	});
};

var deleteCurrentProfile = function () {
	callApi('deleteCurrentProfile').then(function () {
		reloadCurrentTab();
		reloadPopup();
	});
};

var updateProfile = function (id, set) {
	callApi('updateProfile', {id: id, $set: set}).then(function () {
		reloadPopup();
	});
};

const fromat = ( profiles )=>{
	let profileArr = [];
	for (let id in profiles) {
		let profile = profiles[id];
		profile.id = id;
		profileArr.push(profile);
	}
	profileArr.sort(function (a, b) {
		return a.id - b.id;
	});
	return profileArr;
};

const getTrProfileId = (el)=>{
	let tr = Util.parent( el, 'tr');
	let profileId =  tr ? tr.dataset.id : '';
	return profileId;
};

const render = function( data ){
	let profiles = fromat(data.profiles);
	let currentId = data.currentProfileId;

	console.log( data );
	let app = document.querySelector('#app');
	app.innerHTML = buildHtml({
		list: profiles,
		activeId: currentId,
	});
};

const bindEvent = ( ) =>{
	app.addEventListener('click', function(e){
		let profiles = PROFILE_DATA.profiles;
		let currentId = PROFILE_DATA.currentProfileId;

		let el = e.target;
		switch( el.dataset.node ){
			case 'label':
				let id = getTrProfileId(el);
				if( id && id != currentId){
					selectProfile(id);
				}
				break;
			// 删除
			case 'close' :
				deleteCurrentProfile();
				break;
			case 'rename':
				let list = document.querySelector('.list');
				let td = list.querySelector('tr.active td');
				let label = td.querySelector('label');
				let input = document.createElement('input');
				input.value = profiles[currentId].title;
				td.replaceChild(input, label);
				input.focus();
				input.onkeypress = function (e) {
					if (e.keyCode == 13) {
						let val = input.value.trim();
						if( val !== ''){
							updateProfile(currentId, {
								title: input.value,
							});
							return false;
						}
					}
					return true;
				};
				break;
			case 'create':
				newProfile();
				break;
			default: break;
		}
	});
};

let PROFILE_DATA = {};

const initPage = ()=>{
	return callApi('getProfiles').then(function (data) {
		PROFILE_DATA = data;
		render( data );
		return data;
	});
};

document.addEventListener('DOMContentLoaded', ()=>{
	initPage().then( bindEvent );
});
