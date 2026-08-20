// firebase-app.js (compat global)
// Coloque ao lado do index.html. Usa Firebase v9 compat builds via CDN e expõe window.firebaseApp
(function(window){
  'use strict';

  // sua config (já preenchida)
  var firebaseConfig = {
    apiKey: "AIzaSyDD33nsm-Jk3vZt3pSxV6zBZDrWC8qWCp4",
    authDomain: "xanxwer.firebaseapp.com",
    projectId: "xanxwer",
    storageBucket: "xanxwer.firebasestorage.app",
    messagingSenderId: "788787150303",
    appId: "1:788787150303:web:ac6dd538fe8a925ad7d86a",
    measurementId: "G-JYV9PW3BKN"
  };

  var COMPAT_BASE = 'https://www.gstatic.com/firebasejs/9.22.1/';
  var scriptsLoaded = false;
  var inited = false;

  function loadScript(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function(){ resolve(); };
      s.onerror = function(e){ reject(new Error('Erro carregar ' + src)); };
      document.head.appendChild(s);
    });
  }

  async function ensureCompatSdk(){
    if(scriptsLoaded) return;
    // Load compat builds (namespaced firebase global)
    await loadScript(COMPAT_BASE + 'firebase-app-compat.js');
    await loadScript(COMPAT_BASE + 'firebase-auth-compat.js');
    await loadScript(COMPAT_BASE + 'firebase-firestore-compat.js');
    scriptsLoaded = true;
  }

  function initFirebase(customConfig){
    if(inited) return { app: firebase.app(), auth: firebase.auth(), db: firebase.firestore() };
    return ensureCompatSdk().then(function(){
      var cfg = customConfig || firebaseConfig;
      if(!firebase.apps || !firebase.apps.length){
        firebase.initializeApp(cfg);
      }
      inited = true;
      return { app: firebase.app(), auth: firebase.auth(), db: firebase.firestore() };
    });
  }

  function signInAnonymouslyIfNeeded(){
    return new Promise(function(resolve, reject){
      if(!inited) return reject(new Error('Firebase não inicializado'));
      var unsub = firebase.auth().onAuthStateChanged(function(user){
        unsub();
        if(user) return resolve(user);
        firebase.auth().signInAnonymously().then(function(res){ resolve(res.user); }).catch(reject);
      }, reject);
    });
  }

  function setDisplayName(name){
    return new Promise(function(resolve, reject){
      if(!inited) return reject(new Error('Firebase não inicializado'));
      var user = firebase.auth().currentUser;
      if(!user) return reject(new Error('Usuário não autenticado'));
      user.updateProfile({ displayName: name }).catch(function(e){ console.warn('updateProfile falhou', e); })
      .finally(function(){
        var udoc = firebase.firestore().collection('users').doc(user.uid);
        udoc.set({ name: name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
          .then(function(){ resolve(true); })
          .catch(function(err){ console.warn('Erro salvando users doc', err); resolve(true); });
      });
    });
  }

  function sendChatMessage(opts){
    opts = opts || {};
    if(!inited) return Promise.reject(new Error('Firebase não inicializado'));
    var uid = (firebase.auth().currentUser && firebase.auth().currentUser.uid) ? firebase.auth().currentUser.uid : null;
    var col = firebase.firestore().collection('chats');
    return col.add({
      municipio: opts.municipio || 'xanxere',
      author: opts.author || 'Visitante',
      text: opts.text || '',
      uid: uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(docRef){ return docRef.id; });
  }

  function listenChat(opts){
    opts = opts || {};
    if(!inited) throw new Error('Firebase não inicializado');
    var municipio = opts.municipio || 'xanxere';
    var onUpdate = typeof opts.onUpdate === 'function' ? opts.onUpdate : function(){};
    var limitSize = opts.limitSize || 500;
    var q = firebase.firestore().collection('chats')
      .where('municipio','==', municipio)
      .orderBy('createdAt')
      .limit(limitSize);
    var unsub = q.onSnapshot(function(snapshot){
      var out = [];
      snapshot.forEach(function(doc){
        var d = doc.data();
        var createdAt = Date.now();
        if(d.createdAt && d.createdAt.toMillis) createdAt = d.createdAt.toMillis();
        out.push({
          id: doc.id,
          author: d.author,
          text: d.text,
          uid: d.uid || null,
          createdAt: createdAt
        });
      });
      onUpdate(out);
    }, function(err){
      console.error('listenChat error', err);
      onUpdate([]);
    });
    return unsub;
  }

  // expose global helper
  window.firebaseApp = {
    initFirebase: initFirebase,
    signInAnonymouslyIfNeeded: signInAnonymouslyIfNeeded,
    setDisplayName: setDisplayName,
    sendChatMessage: sendChatMessage,
    listenChat: listenChat
  };
})(window);