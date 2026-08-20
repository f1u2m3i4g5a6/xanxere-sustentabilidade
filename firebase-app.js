// firebase-app.js
// Minimal Firebase helper (modular v9+) — pronto para uso com seu projeto.
// Coloque este arquivo ao lado do index.html.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

let app = null;
let auth = null;
let db = null;

const firebaseConfig = {
  apiKey: "AIzaSyDD33nsm-Jk3vZt3pSxV6zBZDrWC8qWCp4",
  authDomain: "xanxwer.firebaseapp.com",
  projectId: "xanxwer",
  storageBucket: "xanxwer.firebasestorage.app",
  messagingSenderId: "788787150303",
  appId: "1:788787150303:web:ac6dd538fe8a925ad7d86a",
  measurementId: "G-JYV9PW3BKN"
};

export default {
  initFirebase(customConfig = null){
    const cfg = customConfig || firebaseConfig;
    if (!app) {
      app = initializeApp(cfg);
      auth = getAuth(app);
      db = getFirestore(app);
    }
    return { app, auth, db };
  },

  async signInAnonymouslyIfNeeded(){
    if(!auth) throw new Error("Firebase não inicializado");
    return new Promise((resolve, reject)=>{
      const unsub = onAuthStateChanged(auth, async (user) => {
        unsub();
        if(user){
          resolve(user);
          return;
        }
        try{
          const res = await signInAnonymously(auth);
          resolve(res.user);
        }catch(err){
          reject(err);
        }
      }, reject);
    });
  },

  // Define display name no profile do auth e salva no documento users/{uid}
  async setDisplayName(name){
    if(!auth) throw new Error("Firebase não inicializado");
    const user = auth.currentUser;
    if(!user) throw new Error("Usuário não autenticado");
    try{
      await updateProfile(user, { displayName: name });
    }catch(e){
      console.warn('updateProfile falhou', e);
    }
    try{
      const udoc = doc(getFirestore(), 'users', user.uid);
      await setDoc(udoc, { name, updatedAt: serverTimestamp() }, { merge: true });
    }catch(e){
      console.warn('Erro salvando users doc', e);
    }
    return true;
  },

  // Envia mensagem para 'chats' (inclui uid)
  async sendChatMessage({ municipio='xanxere', author='Visitante', text='' } = {}){
    if(!db) throw new Error("Firestore não inicializado");
    const uid = auth && auth.currentUser ? auth.currentUser.uid : null;
    const colRef = collection(db, 'chats');
    const docRef = await addDoc(colRef, {
      municipio,
      author,
      text,
      uid,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Escuta mensagens em tempo real filtrando por municipio
  listenChat({ municipio='xanxere', onUpdate = ()=>{}, limitSize = 500 } = {}){
    if(!db) throw new Error("Firestore não inicializado");
    const col = collection(db, 'chats');
    const q = query(col, where('municipio','==', municipio), orderBy('createdAt', 'asc'), limit(limitSize));
    const unsub = onSnapshot(q, snapshot=>{
      const out = [];
      snapshot.forEach(docSnap=>{
        const d = docSnap.data();
        out.push({
          id: docSnap.id,
          author: d.author,
          text: d.text,
          uid: d.uid || null,
          createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : (d.createdAt ? d.createdAt : Date.now())
        });
      });
      onUpdate(out);
    }, err=>{
      console.error('listenChat error', err);
      onUpdate([]);
    });
    return unsub;
  }
};