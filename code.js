document.addEventListener(`DOMContentLoaded`, function () { onLoad(); } );
window.addEventListener("mousedown", function (e) { clicked( e ); } );
window.addEventListener("keydown", function(e) { pressed( e ) } );
window.addEventListener('resize', () => { document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`); } );

var app = {
    round: {
        seed: null
        , letters: []
        , words: []
        , guesses: []
        , input: ``
        , xp: 0
        , level: 0
        , strikes: 0
    }
    , game: {
        round: 0
        , hiScore: -1
    }
    , settings: {
        letters: 5
        , xpBreak: 10 
        , maxLength: 10
        , delay: 500
        , diff: 2
    }
}
var fib = [0, 1, 2, 4, 7, 11, 16, 22, 29, 37, 46, 56];

function onLoad(){
    primeDictionary();
    buildCombos( 15 );
    loadGame();
    //newRound();
}

function clicked( e ){
    let c = e.target.classList;
    if( c.contains(`tile`) ){
        if( app.round.input.length <= app.settings.maxLength ){
            typeLetter( e.target.getAttribute(`data-letter`), e.target.getAttribute(`data-index` ) );
        }
    }
    else if( c.contains(`submit`) ){ submitWord(); }
    else if( c.contains(`backspace`) ){ backspace(); }
    else if( c.contains(`jumble`) ){ jumbleLetters(); }
}
function pressed( e ){
    if( e.key == `Enter` ){ submitWord(); }
    else if( e.key == `Backspace` ){ backspace(); }
    else if( app.round.letters[e.key.toUpperCase()] !== undefined ){
    // else if( app.round.letters.indexOf( e.key.toUpperCase() ) > -1 ){
        if( app.round.input.length <= app.settings.maxLength ){
            typeLetter( e.key.toUpperCase() );
        }
    }
}

function typeLetter( q, i ){
    if( i == undefined ){ // KEYSTROKES
        for( j in Object.keys( app.round.letters ) ){
            let l = Object.keys( app.round.letters )[j];
            if( app.round.letters[l].str == q ){
                i = app.round.letters[l].ind;
                break;
            }
        }    
    }
    for( j in Object.keys( app.round.letters ) ){
        let l = Object.keys( app.round.letters )[j];
        if( app.round.letters[l].ind == i && app.round.letters[l].pressed == false ){
            app.round.letters[l].pressed = true;
            app.round.input += q;
            updateTiles();            
            refreshInput();
        }
    }
}

function refreshInput(){
    document.getElementById(`input`).innerHTML = app.round.input + `<a class="blink">_</a>`
}

function refreshUnderlay(){
    let t = document.querySelector(`.underlay`);
    t.innerHTML = app.game.hiScore;
    if( String( app.game.hiScore ).length >= 3 ){ t.classList.add(`tripDigits`); }
}

function submitWord( q ){
    let w = app.round.input;
    if( q !== undefined ){ w = q; }
    if( String(w).length > 0 ){
        if( dictionary[w.length].indexOf( w ) > -1 ){ // real words only
            if( app.round.guesses.indexOf( w ) == -1 ){ // unique guesses only
                app.round.guesses.push(w);
                let arr = w.split(``);
                for( j in app.round.words ){
                    if( app.round.words[j].ltr.length == arr.length ){ // else there's no point checking
                        let matches = 0;
                        for( k in app.round.words[j].ltr ){
                            if( arr[k] == app.round.words[j].ltr[k] ){
                                matches++;
                            }
                        }
                        if( matches == app.round.words[j].ltr.length ){
                            for( x in app.round.words[j].state ){
                                app.round.words[j].state[x] = `solved`;
                            }
                            app.round.words[j].solved = true;
                            updateBoard();
                            checkComplete();
                        }
                    }
                }
                let s = getScore( app.round.input );
                app.round.xp += s;
                if( app.round.xp >= ( app.round.level + 1 ) * app.settings.xpBreak ){ levelUp(); }
                else{ updateXP( false ); }
                resetKeys();
            }
            else{ repeatGuess( w ); }
        }
        else{ notAWord( w ); }
        saveState();
    }
}

function notAWord( q ){
    app.round.strikes++;
    updateStrikes();
    giveFeedback( `${q} is not a word!`, true );
    resetKeys();
    if( app.round.strikes == 3 ){
        gameOver();
    }
}
function repeatGuess( q ){
    giveFeedback( `You already entered ${q}!`, false );
    resetKeys();
}
function giveFeedback( q, err ){
    clearFeedback();
    let target = document.querySelector(`.feedback`);
    let n = document.createElement(`div`);
    n.classList = `feed`;
    if( err ){ n.classList.add(`notWord`); }
    n.innerHTML = q;
    target.appendChild( n );
    setTimeout(() => { n.classList.add(`fade`); }, 0 );
}

function updateStrikes(){
    let t = document.querySelector(`.strikes`);
    if( app.round.strikes == 0 ){ t.innerHTML = `0 Strikes`; }
    else if( app.round.strikes == 1 ){ t.innerHTML = `1 Strike`; }
    else if( app.round.strikes == 2 ){ t.innerHTML = `2 Strikes`; }
    else if( app.round.strikes == 3 ){ t.innerHTML = `3 Strikes`; }
    if( app.round.strikes >= 2 ){ t.classList.add( `twoStrikes`); }
    else{ t.classList.remove(`twoStrikes`); }
}

function clearFeedback(){
    let w = document.querySelectorAll(`.feed`);
    for( let i = 0; i < w.length; i++ ){
        w[i].parentElement.removeChild(w[i]);
    }
}

function levelUp(){
    updateXP( true ); 
    let times = Math.floor( ( app.round.xp - ( app.round.level * app.settings.xpBreak ) ) / app.settings.xpBreak );
    app.round.level += times;
    setTimeout(() => { unveil( times ); }, app.settings.delay ); 
}

function updateXP( up ){
    let lvls = 0;
    if( app.round.level > 0 ){ lvls = app.round.level * app.settings.xpBreak; }
    let amt = app.round.xp - lvls;
    let perc = amt / app.settings.xpBreak * 100;
    if( up ){
        document.querySelector(`.bar`).style.width = `100%`;
        setTimeout(() => { updateXP( false ); }, app.settings.delay );
    }
    else{
        document.querySelector(`.bar`).style.width = `${perc}%`;
    }
}

function unveil( n ){
    for( let i = 0; i < n; i++ ){
        let options = [];
        for( w in app.round.words ){
            for( l in app.round.words[w].state ){
                if( app.round.words[w].state[l] == `null` ){
                    options.push( { w: w, l: l } );
                }
            }
        }
        if( options.length > 0 ){
            let o = shuffle( options )[0];
            app.round.words[o.w].state[o.l] = `unveiled`;
            let full = true;
            for( s in app.round.words[o.w].state ){
                if( app.round.words[o.w].state[s] !== `unveiled` ){ full = false; }
            }
            if( full ){ submitWord( app.round.words[o.w].ltr.join(``) ); }
        }
    }
    updateBoard();
}

function getScore( q ){
    return fib[q.length];
}

function resetKeys(){
    app.round.input = ``;
    for( j in app.round.letters ){
        app.round.letters[j].pressed = false;
    }
    refreshInput();
    updateTiles();
}

function backspace(){
    if( app.round.input.length > 0 ){
        let l = app.round.input.split(``)[app.round.input.length-1];
        for( j in app.round.letters ){
            if( app.round.letters[j].str == l && app.round.letters[j].pressed){
                app.round.letters[j].pressed = false;
                break;
            }
        }
        app.round.input = app.round.input.slice(0,app.round.input.length - 1);
        updateTiles();
        refreshInput();
    }
}

function jumbleLetters(){
    let ind = [];
    for( i in Object.keys(app.round.letters) ){ ind.push( ind.length ); }
    ind = shuffle( ind );
    for( i in Object.keys(app.round.letters) ){
        app.round.letters[Object.keys(app.round.letters)[i]].ind = ind[i];
    }    
    updateTiles();
}

function updateTiles(){
    let t = document.getElementById(`tiles`);
    for( l in Object.keys( app.round.letters ) ){
        let k = app.round.letters[Object.keys( app.round.letters )[l]];
        t.children[k.ind].innerHTML = app.round.letters[k.str].str;
        t.children[k.ind].setAttribute(`data-letter`, app.round.letters[k.str].str );
        t.children[k.ind].setAttribute(`data-index`, k.ind );
        if( k.pressed ){ t.children[k.ind].classList.add(`pressed`); }
        else{ t.children[k.ind].classList.remove(`pressed`); }
    }
}

function clearInput(){
    app.round.input = ``;
    refreshInput();
}

function gameOver(){
    app.game.round = 0;
    for( i in app.round.words ){
        let t = document.querySelector(`[data-index="${i}"]`);
        for( j in app.round.words[i].ltr ){
            if( app.round.words[i].state[j] == `null` ){
                t.children[j].classList = `solveKey failLetter`;
                t.children[j].innerHTML = `${app.round.words[i].ltr[j]}`;
            }
        }
    }
    document.querySelector(`.bar`).classList.add(`instant`);
    setTimeout(() => { document.querySelector(`main`).classList.add(`fade`); }, app.settings.delay * 4 );
    setTimeout(() => { newRound(); }, app.settings.delay * 6 );
}

function newRound(){
    setTimeout(() => { document.querySelector(`main`).classList.remove(`fade`); }, 0 );
    let a = app.round;
    a.guesses = [];
    a.input = ``;
    a.xp = 0;
    a.level = 0;
    a.strikes = 0;
    let l = getLetters();
    updateTiles();
    app.round.seed = l;
    app.round.guesses = [];
    let w = shuffle( comboPicks[l] );
    app.round.words = [];
    let wCount = app.settings.diff + Math.log2( 1 + app.game.round );
    for( let i = 0; i < wCount; i++ ){
        app.round.words.push( { ltr: w[i].split(``), state: [], solved: false } );
        for( j in app.round.words[i].ltr ){ app.round.words[i].state.push( `null` ); }
    }
    updateXP();
    addRound();
    refreshInput();
    buildBoard();
    updateStrikes();
    clearFeedback();
    setTimeout(() => {
        let ins = document.querySelectorAll(`.instant`);
        for( let i = 0; i < ins.length; i++ ){ ins[i].classList.remove(`instant`); }
    }, app.settings.delay );
    saveState();
}

function getLetters(){
    let n = Math.floor( Math.random() * combos.length );
    arr = shuffle( combos[n].split(``) );
    app.round.letters = {};
    for( let i = 0; i < arr.length; i++ ){
        app.round.letters[arr[i]] = { str: arr[i], pressed: false, ind: i };
    }
    return combos[n];
}

function primeDictionary(){
    const d = new Date();
    let start = d.getTime();
    for( w in dict ){
        if( dict[w].split('').filter(function(item, i, ar){ return ar.indexOf(item) === i; }).join('').length <= app.settings.letters ){
            dictionary[dict[w].length].push(dict[w]);
        }
    }
    const dd = new Date();
    let end = dd.getTime();
    let delta = end - start;
    console.log( `Dictionary ready in ${delta}ms.` )
}

function buildCombos( n ){
    let c = Object.keys( comboPicks );
    for( let i = 0; i < c.length; i++ ){
        if( comboPicks[c[i]].length >= n ){
            combos.push( c[i] );
        }
    }
}

function buildBoard(){
    document.getElementById(`middle`).children[0].innerHTML = ``;
    let c = true;
    for( i in app.round.words ){
        // let target = document.getElementById(`middle`).children[ c ? 0 : 1 ];
        let target = document.getElementById(`middle`).children[0];
        let k = document.createElement(`div`);
        k.classList = `solveStr`;
        k.setAttribute( `data-index`, i );
        for( j in app.round.words[i].ltr ){
            let l = document.createElement(`div`);
            l.classList = `solveKey null`;
            k.appendChild(l);
        }
        target.appendChild(k);
        c = !c;
    }
    updateBoard();
}

function updateBoard(){
    for( i in app.round.words ){
        let t = document.querySelector(`[data-index="${i}"]`);
        for( j in app.round.words[i].ltr ){
            t.children[j].classList = `solveKey ${app.round.words[i].state[j]}`;
            if( app.round.words[i].state[j] !== `null` ){
                t.children[j].innerHTML = `${app.round.words[i].ltr[j]}`;
            }
        }
    }
}

function checkComplete(){
    let max = app.round.words.length;
    let s = 0;
    for( k in app.round.words ){
        if( app.round.words[k].solved ){
            s++;
        }
    }
    if( s == max ){
        document.querySelector(`main`).classList.add(`fade`);        
        setTimeout(() => { document.querySelector(`.bar`).classList.add(`instant`); }, app.settings.delay );
        setTimeout(() => { newRound(); }, app.settings.delay * 2 );        
    }
}

function addRound(){
    app.game.round++;
    document.querySelector(`.round`).innerHTML = `Round ${app.game.round}`;
    if( app.game.hiScore < app.game.round -1 ){
        app.game.hiScore = app.game.round -1;
        refreshUnderlay()
    }
}

function saveState(){
    localStorage.setItem( `app` , JSON.stringify( app ) );
}

function hardReset(){
    localStorage.clear();
    location.reload();
}

function loadGame(){
    if( JSON.parse( localStorage.getItem( `app` ) ) !== null ){
        app = JSON.parse( localStorage.getItem( `app` ) );
        buildBoard();
        updateBoard();
        updateStrikes();
        updateTiles();
        updateXP();
        refreshInput();
        refreshUnderlay();
        checkComplete();
        setTimeout(() => { document.querySelector(`main`).classList.remove(`fade`); }, 0 );
    }
    else{ newRound(); }
}






var si = ["","k","M","B","T","q","Q","s","S","O","D"];

function niceNumber( x ){
    let o = ``;
    if( x < 1000 && x > -1000 ){ o = rounding(x,0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") }
    else{ o = abbrevNum( x ) };
    return o;
}

function abbrevNum(number){
    let neg = false;
    if( number < 0 ){
        neg = true;
        number = Math.abs( number );
    }
    var tier = Math.log10(number) / 3 | 0;
    if(tier == 0) return number;
    var suffix = si[tier];
    var scale = Math.pow(10, tier * 3);
    var scaled = number / scale;
    return ( neg ? `-` : `` ) + scaled.toPrecision(4) + suffix;
}

function rounding(value, exp) {
    if (typeof exp === 'undefined' || +exp === 0)
    return Math.round(value);  
    value = +value;
    exp = +exp;  
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
    return NaN;
    value = value.toString().split('e');
    value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}

function shuffle( array ) {
    for( let i = array.length - 1; i > 0; i-- ){
      let j = Math.floor(Math.random() * ( i + 1 ) );
      [array[i], array[j]] = [array[j], array[i]];
    };
    return array;
}



/*

function findWords(){
    let output = [];
    let o2 = [];
    for( key in combos ){
        output.push( { combo: combos[key], words: [] } );        
        o2.push( { combo: combos[key], words: [] } );        
        let arr = combos[key].split(``);
        for( let i = 0; i < dictionary.length; i++ ){
            for( w in dictionary[i] ){
                if( i == 1 && dictionary[i][w] !== `A` && dictionary[i][w] !== `I` ){}
                else if( dictionary[i][w].replace( arr[0], `` ).replace( arr[1], `` ).replace( arr[2], `` ).replace( arr[3], `` ).replace( arr[4], `` ).length == 0 ){
                    // let ind = output.filter( e => e.type = combos[key] );
                    output[output.length-1].words.push( dictionary[i][w] );
                    if( i > 2 ){
                        o2[output.length-1].words.push( dictionary[i][w] );
                    }
                }
            }
        }
    }
    console.log( output );
    console.log( o2 );
    //return output;
}



function findCombos( x, y, n ){
    let output = [];
    let ltrsA = [`A`,`E`,`I`,`O`,`U`];
    // let ltrsB = [`B`,`C`,`D`,`F`,`G`,`H`,`J`,`K`,`L`,`M`,`N`,`P`,`Q`,`R`,`S`,`T`,`V`,`W`,`X`,`Y`,`Z`];
    let ltrsC = [`A`,`B`,`C`,`D`,`E`,`F`,`G`,`H`,`I`,`J`,`K`,`L`,`M`,`N`,`O`,`P`,`Q`,`R`,`S`,`T`,`U`,`V`,`W`,`X`,`Y`,`Z`];
    let cycles = 0;
    for( x1 in ltrsA ){
        for( x2 in ltrsC ){
            for( x3 in ltrsC ){
                for( x4 in ltrsC ){
                    for( x5 in ltrsC ){
                        let c = 0;
                        for( let i = x; i <= y; i++ ){
                            for( w in dictionary[i] ){
                                let word = dictionary[i][w];                               
                                if( word.replace( ltrsA[x1], `` ).replace( ltrsC[x2], `` ).replace( ltrsC[x3], `` ).replace( ltrsC[x4], `` ).replace( ltrsC[x5], `` ).length == 0 ){
                                    c++;
                                }
                            }
                        }
                        if( c >= n ){
                            output.push( { str: ltrsA[x1] + ltrsC[x2] + ltrsC[x3] + ltrsC[x4] + ltrsC[x5], count: c } );
                        }
                    }
                }
            }
            cycles++;
            console.log( `${cycles} / ${ltrsA.length*ltrsC.length} - ${output.length} combos found.` )
            // console.log( `done with ${ltrsA[x1]} ${ltrsA[x2]} - ${output.length} combos found.` )
        }
    }
    return output;
}

function trimPickList(){
    let trim = [];
    for( key in comboPicks ){
        for( i in comboPicks[key] ){
            let w = comboPicks[key][i];
            if( dontPick.filter( e => e == w ).length > 0 ){
                trim.push( { index: key, ref: i } )
            }
        }
    }
    //console.log( trim )
    for( let x = 200; x >= 0; x-- ){
        for( z in trim ){
            if( trim[z].ref == x ){
                comboPicks[trim[z].index].splice( x, 1 );
            }
        }
    }
    console.log( comboPicks );
}

*/