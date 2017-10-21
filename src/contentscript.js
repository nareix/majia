
!function () {
	var callApi = function (op, params) {
		return new Promise(function (fulfill, reject) {
			params = params || {};
			params.host = window.location.hostname;
			chrome.runtime.sendMessage(null, {op: op, params: params}, {}, fulfill);
		});
	};

	chrome.runtime.onMessage.addListener(function (msg, sender, cb) {
		if (msg.op == 'resetLocalStorageByDomain') {
			if (msg.params.domain == domain) {
				resetLocalStorage(msg.params.content);
				cb(true);
			}
		} else if (msg.op == 'getLocalStorageByDomain') {
			if (msg.params.domain == domain) {
				var res = {}
				for (var k in localStorage)
					res[k] = localStorage.getItem(k);
				cb(res);
			}
		}
		return true;
	});

	var resetLocalStorage = function (content) {
		sessionStorage.clear();
		localStorage.clear();
		for (var k in content)
			localStorage.setItem(k, content[k]);
	};

	var gotUsername = function (name) {
		if (localStorage.getItem('majia.username') == name)
			return;
		localStorage.setItem('majia.username', name);
		callApi('updateUserInfo', {username: name});
	};

	var hostToDomain = function (host) {
		var a = host.split('.');
		if (a.length > 2)
			a = a.slice(a.length-2);
		return a.join('.');
	};
	var domain = hostToDomain(window.location.hostname);

	({
		'douban.com': function () {
			var span = document.querySelector('.nav-user-account span');
			if (span) {
				var m = span.innerHTML.match(new RegExp('(.*)的帐号'));
				m && m[1] && gotUsername(m[1]);
			}
		},

		'zhihu.com': function () {
			var span = document.querySelector('.top-nav-profile .name');
			if (span && span.innerHTML)
				gotUsername(span.innerHTML);
		},

		'weibo.com': function () {
			var em = document.querySelector('[nm="name"] .S_txt1');
			if (em && em.innerHTML) {
				gotUsername(em.innerHTML);
				return;
			}
			var m = document.cookie.match(/un=([^;]+);/);
			m && m[1] && gotUsername(m[1]);
		},

		'twitter.com': function () {
			var span = document.querySelector('.DashboardProfileCard-screennameLink span');
			if (span && span.innerHTML)
				gotUsername(span.innerHTML);
		},

		'facebook.com': function () {
			var span = document.querySelector('[data-click="profile_icon"] span');
			if (span && span.innerHTML)
				gotUsername(span.innerHTML);
		},

	}[domain] || function () {})();
}();

