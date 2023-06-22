/* (c) 2007 - now() Ondrej Zara, 1.7 */
let OZ = {
    $: function (x) {
        return typeof x == "string" ? document.getElementById(x) : x;
    },
    select: function (x) {
        return document.querySelectorAll(x);
    },
    opera: !!window.opera,
    ie: !!document.attachEvent && !window.opera,
    gecko: !!document.getAnonymousElementByAttribute,
    webkit: !!navigator.userAgent.match(/webkit/i),
    khtml:
        !!navigator.userAgent.match(/khtml/i) ||
        !!navigator.userAgent.match(/konqueror/i),
    Event: {
        _id: 0,
        _byName: {},
        _byID: {},
        add: function (elm, event, cb) {
            let id = OZ.Event._id++;
            let element = OZ.$(elm);
            let fnc =
                element && element.attachEvent
                    ? function () {
                          return cb.apply(element, arguments);
                      }
                    : cb;
            let rec = [element, event, fnc];
            let parts = event.split(" ");
            while (parts.length) {
                let e = parts.pop();
                if (element) {
                    if (element.addEventListener) {
                        element.addEventListener(e, fnc, false);
                    } else if (element.attachEvent) {
                        element.attachEvent("on" + e, fnc);
                    }
                }
                if (!(e in OZ.Event._byName)) {
                    OZ.Event._byName[e] = {};
                }
                OZ.Event._byName[e][id] = rec;
            }
            OZ.Event._byID[id] = rec;
            return id;
        },
        remove: function (id) {
            let rec = OZ.Event._byID[id];
            if (!rec) {
                return;
            }
            let elm = rec[0];
            let parts = rec[1].split(" ");
            while (parts.length) {
                let e = parts.pop();
                if (elm) {
                    if (elm.removeEventListener) {
                        elm.removeEventListener(e, rec[2], false);
                    } else if (elm.detachEvent) {
                        elm.detachEvent("on" + e, rec[2]);
                    }
                }
                delete OZ.Event._byName[e][id];
            }
            delete OZ.Event._byID[id];
        },
        stop: function (e) {
            e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true);
        },
        prevent: function (e) {
            e.preventDefault ? e.preventDefault() : (e.returnValue = false);
        },
        target: function (e) {
            return e.target || e.srcElement;
        },
    },
    Class: function () {
        let c = function () {
            let init = arguments.callee.prototype.init;
            if (init) {
                init.apply(this, arguments);
            }
        };
        c.implement = function (parent) {
            for (let p in parent.prototype) {
                this.prototype[p] = parent.prototype[p];
            }
            return this;
        };
        c.extend = function (parent) {
            let tmp = function () {};
            tmp.prototype = parent.prototype;
            this.prototype = new tmp();
            this.prototype.constructor = this;
            return this;
        };
        c.prototype.bind = function (fnc) {
            return fnc.bind(this);
        };
        c.prototype.dispatch = function (type, data) {
            let obj = {
                type: type,
                target: this,
                timeStamp: new Date().getTime(),
                data: data,
            };
            let tocall = [];
            let list = OZ.Event._byName[type];
            for (let id in list) {
                let item = list[id];
                if (!item[0] || item[0] == this) {
                    tocall.push(item[2]);
                }
            }
            let len = tocall.length;
            for (let i = 0; i < len; i++) {
                tocall[i](obj);
            }
        };
        return c;
    },
    DOM: {
        elm: function (name, opts) {
            let elm = document.createElement(name);
            for (let p in opts) {
                let val = opts[p];
                if (p == "class") {
                    p = "className";
                }
                if (p in elm) {
                    elm[p] = val;
                }
            }
            OZ.Style.set(elm, opts);
            return elm;
        },
        text: function (str) {
            return document.createTextNode(str);
        },
        clear: function (node) {
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
        },
        pos: function (elm) {
            /* relative to _viewport_ */
            let cur = OZ.$(elm);
            let html = cur.ownerDocument.documentElement;
            let parent = cur.parentNode;
            let x = (y = 0);
            if (cur == html) {
                return [x, y];
            }
            while (1) {
                if (OZ.Style.get(cur, "position") == "fixed") {
                    x += cur.offsetLeft;
                    y += cur.offsetTop;
                    return [x, y];
                }

                if (
                    OZ.opera &&
                    (parent == html || OZ.Style.get(cur, "display") != "block")
                ) {
                } else {
                    x -= parent.scrollLeft;
                    y -= parent.scrollTop;
                }
                if (parent == cur.offsetParent || cur.parentNode == html) {
                    x += cur.offsetLeft;
                    y += cur.offsetTop;
                    cur = parent;
                }

                if (parent == html) {
                    return [x, y];
                }
                parent = parent.parentNode;
            }
        },
        scroll: function () {
            let x =
                document.documentElement.scrollLeft ||
                document.body.scrollLeft ||
                0;
            let y =
                document.documentElement.scrollTop ||
                document.body.scrollTop ||
                0;
            return [x, y];
        },
        win: function (avail) {
            return avail
                ? [window.innerWidth, window.innerHeight]
                : [
                      document.documentElement.clientWidth,
                      document.documentElement.clientHeight,
                  ];
        },
        hasClass: function (node, className) {
            let cn = OZ.$(node).className;
            let arr = cn ? cn.split(" ") : [];
            return arr.indexOf(className) != -1;
        },
        addClass: function (node, className) {
            if (OZ.DOM.hasClass(node, className)) {
                return;
            }
            let cn = OZ.$(node).className;
            let arr = cn ? cn.split(" ") : [];
            arr.push(className);
            OZ.$(node).className = arr.join(" ");
        },
        removeClass: function (node, className) {
            if (!OZ.DOM.hasClass(node, className)) {
                return;
            }
            let cn = OZ.$(node).className;
            let arr = cn ? cn.split(" ") : [];
            let arr = arr.filter(function ($) {
                return $ != className;
            });
            OZ.$(node).className = arr.join(" ");
        },
        append: function () {
            if (arguments.length == 1) {
                let arr = arguments[0];
                let root = OZ.$(arr[0]);
                for (let i = 1; i < arr.length; i++) {
                    root.appendChild(OZ.$(arr[i]));
                }
            } else
                for (let i = 0; i < arguments.length; i++) {
                    OZ.DOM.append(arguments[i]);
                }
        },
    },
    Style: {
        get: function (elm, prop) {
            if (document.defaultView && document.defaultView.getComputedStyle) {
                try {
                    var cs = elm.ownerDocument.defaultView.getComputedStyle(
                        elm,
                        ""
                    );
                } catch (e) {
                    return false;
                }
                if (!cs) {
                    return false;
                }
                return cs[prop];
            } else {
                return elm.currentStyle[prop];
            }
        },
        set: function (elm, obj) {
            for (let p in obj) {
                let val = obj[p];
                if (p == "opacity" && OZ.ie) {
                    p = "filter";
                    val = "alpha(opacity=" + Math.round(100 * val) + ")";
                    elm.style.zoom = 1;
                } else if (p == "float") {
                    p = OZ.ie ? "styleFloat" : "cssFloat";
                }
                if (p in elm.style) {
                    elm.style[p] = val;
                }
            }
        },
    },
    Request: function (url, callback, options) {
        let o = { data: false, method: "get", headers: {}, xml: false };
        for (let p in options) {
            o[p] = options[p];
        }
        o.method = o.method.toUpperCase();

        let xhr = false;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        } else {
            return false;
        }
        xhr.open(o.method, url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState != 4) {
                return;
            }
            if (!callback) {
                return;
            }
            let data = o.xml ? xhr.responseXML : xhr.responseText;
            let headers = {};
            let h = xhr.getAllResponseHeaders();
            if (h) {
                h = h.split(/[\r\n]/);
                for (let i = 0; i < h.length; i++)
                    if (h[i]) {
                        let v = h[i].match(/^([^:]+): *(.*)$/);
                        headers[v[1]] = v[2];
                    }
            }
            callback(data, xhr.status, headers);
        };
        if (o.method == "POST") {
            xhr.setRequestHeader(
                "Content-Type",
                "application/x-www-form-urlencoded"
            );
        }
        for (let p in o.headers) {
            xhr.setRequestHeader(p, o.headers[p]);
        }
        xhr.send(o.data || null);
        return xhr;
    },
};

if (!Function.prototype.bind) {
    Function.prototype.bind = function (thisObj) {
        let fn = this;
        let args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                thisObj,
                args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (item, from) {
        let len = this.length;
        let i = from || 0;
        if (i < 0) {
            i += len;
        }
        for (; i < len; i++) {
            if (i in this && this[i] === item) {
                return i;
            }
        }
        return -1;
    };
}
if (!Array.indexOf) {
    Array.indexOf = function (obj, item, from) {
        return Array.prototype.indexOf.call(obj, item, from);
    };
}

if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function (item, from) {
        let len = this.length;
        let i = from || len - 1;
        if (i < 0) {
            i += len;
        }
        for (; i > -1; i--) {
            if (i in this && this[i] === item) {
                return i;
            }
        }
        return -1;
    };
}
if (!Array.lastIndexOf) {
    Array.lastIndexOf = function (obj, item, from) {
        return Array.prototype.lastIndexOf.call(obj, item, from);
    };
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (cb, _this) {
        let len = this.length;
        for (let i = 0; i < len; i++) {
            if (i in this) {
                cb.call(_this, this[i], i, this);
            }
        }
    };
}
if (!Array.forEach) {
    Array.forEach = function (obj, cb, _this) {
        Array.prototype.forEach.call(obj, cb, _this);
    };
}

if (!Array.prototype.every) {
    Array.prototype.every = function (cb, _this) {
        let len = this.length;
        for (let i = 0; i < len; i++) {
            if (i in this && !cb.call(_this, this[i], i, this)) {
                return false;
            }
        }
        return true;
    };
}
if (!Array.every) {
    Array.every = function (obj, cb, _this) {
        return Array.prototype.every.call(obj, cb, _this);
    };
}

if (!Array.prototype.some) {
    Array.prototype.some = function (cb, _this) {
        let len = this.length;
        for (let i = 0; i < len; i++) {
            if (i in this && cb.call(_this, this[i], i, this)) {
                return true;
            }
        }
        return false;
    };
}
if (!Array.some) {
    Array.some = function (obj, cb, _this) {
        return Array.prototype.some.call(obj, cb, _this);
    };
}

if (!Array.prototype.map) {
    Array.prototype.map = function (cb, _this) {
        let len = this.length;
        let res = new Array(len);
        for (let i = 0; i < len; i++) {
            if (i in this) {
                res[i] = cb.call(_this, this[i], i, this);
            }
        }
        return res;
    };
}
if (!Array.map) {
    Array.map = function (obj, cb, _this) {
        return Array.prototype.map.call(obj, cb, _this);
    };
}

if (!Array.prototype.filter) {
    Array.prototype.filter = function (cb, _this) {
        let len = this.length;
        let res = [];
        for (let i = 0; i < len; i++) {
            if (i in this) {
                let val = this[i];
                if (cb.call(_this, val, i, this)) {
                    res.push(val);
                }
            }
        }
        return res;
    };
}
if (!Array.filter) {
    Array.filter = function (obj, cb, _this) {
        return Array.prototype.filter.call(obj, cb, _this);
    };
}
