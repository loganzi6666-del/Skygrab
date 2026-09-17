(function(){
  const form=document.querySelector('#download-form'); if(!form) return;
  const input=document.querySelector('#post-url'),btn=document.querySelector('#submit-btn'),status=document.querySelector('#status'),result=document.querySelector('#result'),thumb=document.querySelector('#thumb'),resultText=document.querySelector('#result-text');
  const dict={
    ja:{search:'検索',searching:'検索中…',download:'動画をダウンロード',invalid:'Blueskyの投稿URLを入力してください。例: https://bsky.app/profile/ユーザー名/post/...',loading:'動画を確認しています…',novideo:'この投稿にはダウンロードできる動画がありません。動画付きの公開投稿URLを入力してください。',notfound:'投稿が見つかりません。削除済み、非公開、またはURLが正しくない可能性があります。',fail:'投稿を取得できませんでした。時間をおいてもう一度お試しください。',ready:'動画を見つけました。上の青い「動画をダウンロード」ボタンから保存できます。'},
    en:{search:'Search',searching:'Searching…',download:'Download Video',invalid:'Paste a Bluesky post URL, for example: https://bsky.app/profile/user/post/...',loading:'Finding the video…',novideo:'This post does not contain a downloadable video. Paste a public Bluesky post that includes a video.',notfound:'This post could not be found. It may be deleted, unavailable, or the URL may be incorrect.',fail:'We could not fetch this post. Please try again in a moment.',ready:'Video found. Use the blue “Download Video” button above to save it.'},
    pt:{search:'Buscar',searching:'Buscando…',download:'Baixar vídeo',invalid:'Cole uma URL de uma publicação do Bluesky, por exemplo: https://bsky.app/profile/user/post/...',loading:'Procurando o vídeo…',novideo:'Esta publicação não contém um vídeo disponível para download. Cole uma publicação pública do Bluesky que tenha vídeo.',notfound:'A publicação não foi encontrada. Ela pode ter sido removida, estar indisponível ou a URL pode estar incorreta.',fail:'Não foi possível acessar esta publicação. Tente novamente em instantes.',ready:'Vídeo encontrado. Use o botão azul “Baixar vídeo” acima para salvar.'},
    ko:{search:'검색',searching:'검색 중…',download:'영상 다운로드',invalid:'Bluesky 게시물 URL을 붙여 넣어 주세요. 예: https://bsky.app/profile/user/post/...',loading:'영상을 찾고 있습니다…',novideo:'이 게시물에는 다운로드할 영상이 없습니다. 영상이 포함된 공개 Bluesky 게시물 URL을 입력해 주세요.',notfound:'게시물을 찾을 수 없습니다. 삭제되었거나 비공개 상태이거나 URL이 잘못되었을 수 있습니다.',fail:'게시물을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',ready:'영상을 찾았습니다. 위의 파란색 “영상 다운로드” 버튼을 눌러 저장할 수 있습니다.'}
  };
  const lang=document.documentElement.lang.startsWith('ja')?'ja':document.documentElement.lang.startsWith('pt')?'pt':document.documentElement.lang.startsWith('ko')?'ko':'en';
  let currentDownloadUrl='';
  let currentInput='';

  function showStatus(message,type){status.className='status show '+type;status.textContent=message}
  function hideStatus(){status.className='status';status.textContent=''}
  function hideResult(){result.className='result'}
  function resetToSearch(clearMessages=true){
    currentDownloadUrl='';currentInput='';btn.textContent=dict[lang].search;btn.disabled=false;hideResult();if(clearMessages)hideStatus();
  }
  function startDownload(){
    if(!currentDownloadUrl) return;
    const a=document.createElement('a');
    a.href=currentDownloadUrl;
    a.rel='nofollow';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  btn.textContent=dict[lang].search;
  input.addEventListener('input',()=>resetToSearch(true));

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const url=input.value.trim();

    if(currentDownloadUrl && url===currentInput){startDownload();return}
    hideResult();
    if(!/^https:\/\/(www\.)?bsky\.app\/profile\/[^/]+\/post\/[^/?#]+/i.test(url)){showStatus(dict[lang].invalid,'error');btn.textContent=dict[lang].search;return}

    btn.disabled=true;btn.textContent=dict[lang].searching;showStatus(dict[lang].loading,'loading');
    try{
      const res=await fetch('/api/post?url='+encodeURIComponent(url));
      const data=await res.json();
      if(!res.ok){
        btn.textContent=dict[lang].search;
        if(data.error==='video_not_found'){showStatus(dict[lang].novideo,'error');return}
        if(data.error==='post_not_found'||data.error==='post_fetch_failed'||data.error==='handle_not_found'||data.error==='did_not_found'){showStatus(dict[lang].notfound,'error');return}
        throw new Error(data.error||'fetch_failed');
      }
      if(!data.downloadUrl){btn.textContent=dict[lang].search;showStatus(dict[lang].novideo,'error');return}

      currentDownloadUrl=data.downloadUrl;
      currentInput=url;
      hideStatus();
      if(data.thumbnail){thumb.src=data.thumbnail;thumb.hidden=false}else{thumb.hidden=true}
      resultText.textContent=dict[lang].ready;
      result.className='result show';
      btn.textContent=dict[lang].download;
    }catch(err){
      btn.textContent=dict[lang].search;
      showStatus(dict[lang].fail,'error');
    }finally{btn.disabled=false}
  })
})();