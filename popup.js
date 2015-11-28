
var reloadCurrentTab = function () {
	chrome.tabs.query({'active': true}, function(tabs) {
		chrome.tabs.reload(tabs[0].id);
	});
};

var reloadPopup = function () {
	window.location.reload();
};

var callApi = function (op, params) {
	return new Promise(function (fulfill, reject) {
		params = params || {};

		chrome.tabs.query({'active': true}, function(tabs) {
			var urlParseRE = /^(((([^:\/#\?]+:)?(?:(\/\/)((?:(([^:@\/#\?]+)(?:\:([^:@\/#\?]+))?)@)?(([^:\/#\?\]\[]+|\[[^\/\]@#?]+\])(?:\:([0-9]+))?))?)?)?((\/?(?:[^\/\?#]+\/+)*)([^\?#]*)))?(\?[^#]+)?)(#.*)?/;
			var matches = urlParseRE.exec(tabs[0].url);
			params.host = matches[11];

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

document.addEventListener('DOMContentLoaded', function () {
	callApi('getProfiles').then(function (data) {
		var profiles = [];
		for (var id in data.profiles) {
			var profile = data.profiles[id];
			profile.id = id;
			profiles.push(profile);
		}
		profiles.sort(function (a, b) {
			return a.id - b.id;
		})

		var mainDiv = document.createElement('div');

		profiles.forEach(function (profile) {
			var title = profile.title;
			if (profile.id == data.currentProfileId)
				title = '['+title+']';

			var button = document.createElement('button');
			button.innerHTML = title;

			if (profile.id != data.currentProfileId) {
				button.onclick = function () {
					selectProfile(profile.id);
				};
			}

			mainDiv.appendChild(button);
		});
	
		var button = document.createElement('button');
		button.innerHTML = '新建..';
		button.onclick = newProfile;
		mainDiv.appendChild(button);

		if (profiles.length > 1) {
			var button = document.createElement('button');
			button.innerHTML = '删除';
			button.onclick = deleteCurrentProfile;
			mainDiv.appendChild(button);

			var button = document.createElement('button');
			var input = document.createElement('input');
			input.value = data.profiles[data.currentProfileId].title;

			button.innerHTML = '重命名';
			button.onclick = function () {
				button.parentNode.replaceChild(input, button);
				input.focus();
				input.onkeypress = function (e) {
					if (e.keyCode == 13) {
						updateProfile(data.currentProfileId, {
							title: input.value,
						});
						return false;
					}
					return true;
				};
			};
			mainDiv.appendChild(button);
		}

		document.body.appendChild(mainDiv);
	});
});

