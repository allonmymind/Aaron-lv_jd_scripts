const $ = new Env('更新京小超PK队伍ID');
// const cookie = process.env.JD_COOKIE;
let cookiesArr = [], cookie = '';
const notify = $.isNode() ? require('./sendNotify') : '';
const fs = require('fs');
const jdCookieNode = require('./jdCookie.js');
Object.keys(jdCookieNode).forEach((item) => {
  cookiesArr.push(jdCookieNode[item])
})
// cookiesArr = cookiesArr.splice(0, 10);
if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};

const JD_API_HOST = 'https://api.m.jd.com/api';
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
    return;
  }
  $.teamIdArr = [];
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
      $.index = i + 1;
      await getTeamId();
    }
  }
  await writeFile();
  // await showMsg();
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
function showMsg() {
  return new Promise(async resolve => {
    try {
      console.log(`等待五秒后刷新CDN缓存`);
      await $.wait(5000);
      await $.http.get({url: `https://purge.jsdelivr.net/gh/lxk0301/updateTeam@master/jd_updateTeam.json`}).then((resp) => {
        if (resp.statusCode === 200) {
          console.log(`已刷新CDN缓存`)
        } else {
          console.log(`刷新失败::${JSON.stringify(resp)}`)
        }
      });
    } catch (e) {
      $.log(e)
    } finally {
      resolve()
    }
  })
}
async function writeFile() {
  console.log(`\nteamId\n${JSON.stringify($.teamIdArr)}\n`)
  cookie = cookiesArr[0];
  const smtg_getTeamPkDetailInfoRes = await smtg_getTeamPkDetailInfo();
  if (smtg_getTeamPkDetailInfoRes && smtg_getTeamPkDetailInfoRes.data.bizCode === 0) {
    const {joinStatus, pkActivityId, teamId, inviteCode, currentUserPkInfo} = smtg_getTeamPkDetailInfoRes.data.result;
    if (joinStatus === 0) {
      console.log(`暂未加入战队`);
    } else if (joinStatus === 1) {
      console.log(`${decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])}  已加入战队 [${currentUserPkInfo.teamName}]/[${teamId}]`);

      let jd_superMarketTeam = await fs.readFileSync('./jd_updateTeam.json');
      jd_superMarketTeam = JSON.parse(jd_superMarketTeam);
      if (jd_superMarketTeam.pkActivityId === pkActivityId) {
        console.log(`pkActivityId【${pkActivityId}】暂无变化, 暂不替换json文件`);
        // jd_superMarketTeam.Teams = [...jd_superMarketTeam.Teams, ...($.teamIdArr || [].push({teamId, inviteCode}))];
        // console.log(`去重之前的`, jd_superMarketTeam.Teams.length)
        // jd_superMarketTeam.Teams = unique(jd_superMarketTeam.Teams, 'inviteCode');
        // console.log(`去重之后的`, jd_superMarketTeam.Teams.length)
        // await fs.writeFileSync('jd_updateTeam.json', JSON.stringify(jd_superMarketTeam));
        // console.log(`文件写入成功，时间(北京)${new Date((new Date().getTime() + new Date().getTimezoneOffset()*60*1000 + 8*60*60*1000)).toLocaleString()}`);
      } else {
        const info = {
          pkActivityId,
          "Teams": $.teamIdArr || [].push({teamId, inviteCode}),
        }
        await fs.writeFileSync('jd_updateTeam.json', JSON.stringify(info));
        console.log(`文件写入成功，新的teamId:[${teamId}]和pkActivityId:[${info.pkActivityId}]已经替换`);
      }
    }
  } else {
    console.log(`文件暂未开始写入，其他问题::${JSON.stringify(smtg_getTeamPkDetailInfoRes)}`);
  }
}
//获取PK队伍ID
async function getTeamId() {
  const smtg_getTeamPkDetailInfoRes = await smtg_getTeamPkDetailInfo();
  if (smtg_getTeamPkDetailInfoRes && smtg_getTeamPkDetailInfoRes.data.bizCode === 0) {
    const {joinStatus, teamId, currentUserPkInfo, pkUserPkInfo, inviteCode} = smtg_getTeamPkDetailInfoRes.data.result;
    if (joinStatus === 0 && !teamId) {
      const DateNow = new Date().getTime() + new Date().getTimezoneOffset()*60*1000 + 8*60*60*1000;
      const DateNowH = new Date(DateNow).getHours();
      console.log(`现在北京时间：${DateNowH}点，第${$.index}个京东账号`);
      console.log(`暂未加入战队,现在等待120秒后开始创建PK战队`);
      await smtg_createPkTeam();
      await getTeamId();
      await $.wait(1000 * 60 * 4);
    } else if (joinStatus === 1) {
      if (teamId) {
        console.log(`账号${$.index} ${$.UserName}--已加入战队 [${currentUserPkInfo.teamName}]/[${teamId}]`);

        console.log(`\n我方战队战队 [${currentUserPkInfo.teamName}]/【${currentUserPkInfo.teamCount}】`);
        if (pkUserPkInfo.teamId) {
          console.log(`对方战队战队 [${pkUserPkInfo.teamName}]/【${pkUserPkInfo.teamCount}】\n`);
        } else {
          console.log(`对方战队战队 暂未匹配到对手\n`);
        }
        $.teamIdArr.push({teamId, inviteCode})
      }
    }
  } else if (smtg_getTeamPkDetailInfoRes && smtg_getTeamPkDetailInfoRes.data.bizCode === 300) {
    console.log(`京东cookie已失效,请重新登陆`)
    if ($.isNode()) {
      await notify.sendNotify(`${$.name}cookie已失效`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
    }
  } else {
    console.log(`其他问题::${JSON.stringify(smtg_getTeamPkDetailInfoRes)}`);
  }
}
//创建PK战队API
function smtg_createPkTeam() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_createPkTeam', { "teamName": `lxk030${$.index}`,  "channel": "1" }), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京小超: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          console.log(`创建PK队伍结果::${data}`);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
function smtg_getTeamPkDetailInfo() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_getTeamPkDetailInfo'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京小超: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
/**
 *    arr：要去重的数组
 *    attr: 去重根据的属性
 */
function unique(arr, attr) {
  const res = new Map();
  return arr.filter((item) => {
    const attrItem = item[attr]
    return !res.has(attrItem) && res.set(attrItem, 1)
  })
}
function taskUrl(function_id, body = {}) {
  return {
    url: `${JD_API_HOST}?functionId=${function_id}&appid=jdsupermarket&clientVersion=8.0.0&client=m&body=${escape(JSON.stringify(body))}&t=${Date.now()}`,
    headers: {
      'User-Agent': 'jdapp;iPhone;9.0.8;13.6;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
      'Host': 'api.m.jd.com',
      'Cookie': cookie,
      'Referer': 'https://jdsupermarket.jd.com/game',
      'Origin': 'https://jdsupermarket.jd.com',
    }
  }
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,o)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),h=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)}):this.isQuanX()?$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t)):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t)))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t))}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",o){const r=t=>{if(!t||!this.isLoon()&&this.isSurge())return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,r(o)):this.isQuanX()&&$notify(e,s,i,r(o)));let h=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
