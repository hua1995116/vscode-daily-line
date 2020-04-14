(function () {
  const vscode = acquireVsCodeApi();

  let target = "container";
  let transparentBackground = false;
  let backgroundColor = "#f2f2f2";

  vscode.postMessage({
    type: "getAndUpdateCacheAndSettings",
  });

  const snippetNode = document.getElementById("snippet");
  const snippetContainerNode = document.getElementById("snippet-container");
  const obturateur = document.getElementById("save");

  snippetContainerNode.style.opacity = "1";
  const oldState = vscode.getState();
  if (oldState && oldState.innerHTML) {
    snippetNode.innerHTML = oldState.innerHTML;
  }
  var bar_styles = ["░▒▓█"];

  function repeat(s, i) {
    var r = "";
    for (var j = 0; j < i; j++) r += s;
    return r;
  }
  function make_bar(p, bar_style, min_size, max_size) {
    var d,
      full,
      m,
      middle,
      r,
      rest,
      x,
      min_delta = Number.POSITIVE_INFINITY,
      full_symbol = bar_style[bar_style.length - 1],
      n = bar_style.length - 1;
    if (p == 100) return { str: repeat(full_symbol, 10), delta: 0 };
    p = p / 100;
    for (var i = max_size; i >= min_size; i--) {
      x = p * i;
      full = Math.floor(x);
      rest = x - full;
      middle = Math.floor(rest * n);
      if (p != 0 && full == 0 && middle == 0) middle = 1;
      d = Math.abs(p - (full + middle / n) / i) * 100;
      if (d < min_delta) {
        min_delta = d;
        m = bar_style[middle];
        if (full == i) m = "";
        r = repeat(full_symbol, full) + m + repeat(bar_style[0], i - full - 1);
      }
    }
    return { str: r, delta: min_delta };
  }

  const serializeBlob = (blob, cb) => {
    const fileReader = new FileReader();

    fileReader.onload = () => {
      const bytes = new Uint8Array(fileReader.result);
      cb(Array.from(bytes).join(","));
    };
    function getBrightness(color) {
      const rgb = this.toRgb();
      return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    }

    fileReader.readAsArrayBuffer(blob);
  };

  function shoot(serializedBlob) {
    vscode.postMessage({
      type: "shoot",
      data: {
        serializedBlob,
      },
    });
  }

  function getBrightness(hexColor) {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  obturateur.addEventListener("click", () => {
    if (target === "container") {
      shootAll();
    } else {
      shootSnippet();
    }
  });

  function shootAll() {
    const width = snippetContainerNode.offsetWidth * 2;
    const height = snippetContainerNode.offsetHeight * 2;
    const config = {
      width,
      height,
      style: {
        transform: "scale(2)",
        "transform-origin": "center",
        background: getRgba(backgroundColor, transparentBackground),
      },
    };

    // Hide resizer before capture
    snippetNode.style.resize = "none";
    snippetContainerNode.style.resize = "none";

    domtoimage.toBlob(snippetContainerNode, config).then((blob) => {
      snippetNode.style.resize = "";
      snippetContainerNode.style.resize = "";
      serializeBlob(blob, (serializedBlob) => {
        shoot(serializedBlob);
      });
    });
  }

  function shootSnippet() {
    const width = snippetNode.offsetWidth * 2;
    const height = snippetNode.offsetHeight * 2;
    const config = {
      width,
      height,
      style: {
        transform: "scale(2)",
        "transform-origin": "center",
        padding: 0,
        background: "none",
      },
    };

    // Hide resizer before capture
    snippetNode.style.resize = "none";
    snippetContainerNode.style.resize = "none";

    domtoimage.toBlob(snippetContainerNode, config).then((blob) => {
      snippetNode.style.resize = "";
      snippetContainerNode.style.resize = "";
      serializeBlob(blob, (serializedBlob) => {
        shoot(serializedBlob);
      });
    });
  }

  function getCodeHtml(line, time, day) {
    const timeradio = ~~((time * 100) / 24);
    const timeHTML = make_bar(timeradio, bar_styles[0], 5, 20);
    const logo = `<div id="logo"><svg width="30px" height="30px" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
    <g>
        <path d="M191.97885,0 L191.97885,219.867316 L0,191.353848 L191.97885,255.998083 L255.97885,229.374998 L255.97885,30.592308 L256,30.5826932 L255.97885,30.5403853 L255.97885,26.6250001 L191.97885,0 Z M124.796158,37.4576925 L65.9942314,95.5826932 L30.5923079,68.9211553 L16.0019234,73.7942316 L52.0192315,109.398076 L16.0019234,145.000006 L30.5923079,149.875005 L65.9942314,123.211541 L65.9961553,123.211541 L124.794228,181.332699 L160.011538,166.369233 L160.011538,52.4211546 L124.796158,37.4576925 Z M124.794228,78.9307702 L124.794228,139.857695 L84.340386,109.394236 L124.794228,78.9307702 Z" fill="#016EC5"></path>
    </g>
  </svg></div>`;
    return `<div id="day">${day}</div><div>💻 今日写代码${line}行</div><div>⏱️ ${timeHTML.str} ${timeradio}%</div><div class="line"></div>${logo}`;
  }

  window.addEventListener("message", (e) => {
    if (e) {
      if (e.data.type === "update") {
        const { fontFamily, bgColor, line, time, day } = e.data;
        snippetNode.innerHTML = getCodeHtml(line, time, day);
      }
    }
  });
})();

function getRgba(hex, transparentBackground) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const a = transparentBackground ? 0 : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
