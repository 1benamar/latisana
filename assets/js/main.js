/* La Tisana · comportamiento de la página.
   Todo el contenido está en el HTML; este archivo solo lo enriquece:
   estado de apertura en hora de Lloret, la nota que se envía por WhatsApp,
   el menú en móvil, el logo de la barra y las apariciones al bajar. */
(function () {
  "use strict";

  var raiz = document.documentElement;
  var parametros = new URLSearchParams(location.search);
  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, nombre) {
    try { fn(); } catch (e) { if (window.console) console.warn("[La Tisana] " + nombre + ":", e); }
  }

  // ?captura apaga animaciones para las capturas de revisión
  if (parametros.has("captura")) raiz.classList.add("captura");
  raiz.classList.add("js");

  var WHATSAPP = "34648053976";
  var SALUDO = "Hola, os escribo desde la web de La Tisana.";

  // Horario de la ficha de Google (8-11-2026). Domingo = 0.
  var HORARIO = {
    0: [], 1: [[10, 13.5], [17, 20]], 2: [[10, 13.5], [17, 20]], 3: [[10, 13.5], [17, 20]],
    4: [[10, 13.5], [17, 20]], 5: [[10, 13.5], [17, 20]], 6: []
  };
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  function hora(h) {
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return hh + ":" + (mm < 10 ? "0" : "") + mm;
  }

  // Día y hora en Lloret de Mar, con ?dia=1&hora=11:30 para revisar estados
  function ahora() {
    if (parametros.has("hora") || parametros.has("dia")) {
      var p = (parametros.get("hora") || "11:00").split(":");
      return { dia: Number(parametros.get("dia") || 1), h: Number(p[0]) + Number(p[1] || 0) / 60 };
    }
    var partes = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var v = {};
    partes.forEach(function (x) { v[x.type] = x.value; });
    var dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dia: dias[v.weekday], h: (Number(v.hour) % 24) + Number(v.minute) / 60 };
  }

  function estado() {
    var t = ahora();
    var hoy = HORARIO[t.dia];
    for (var i = 0; i < hoy.length; i++) {
      if (t.h >= hoy[i][0] && t.h < hoy[i][1]) {
        return { abierta: true, texto: "Abierta ahora, hasta las " + hora(hoy[i][1]), t: t };
      }
    }
    for (var j = 0; j < hoy.length; j++) {
      if (t.h < hoy[j][0]) return { abierta: false, texto: "Cerrada ahora. Abre hoy a las " + hora(hoy[j][0]), t: t };
    }
    for (var d = 1; d <= 7; d++) {
      var dia = (t.dia + d) % 7;
      if (HORARIO[dia].length) {
        var cuando = d === 1 ? "mañana" : "el " + DIAS[dia];
        return { abierta: false, texto: "Cerrada ahora. Abre " + cuando + " a las " + hora(HORARIO[dia][0][0]), t: t };
      }
    }
    return { abierta: false, texto: "Cerrada ahora", t: t };
  }

  function pintaEstado() {
    var e = estado();
    document.querySelectorAll("[data-estado]").forEach(function (nodo) {
      nodo.classList.toggle("estado--abierta", e.abierta);
      nodo.classList.toggle("estado--cerrada", !e.abierta);
      var punto = nodo.querySelector(".estado__punto");
      if (!punto) {
        punto = document.createElement("span");
        punto.className = "estado__punto";
        punto.setAttribute("aria-hidden", "true");
        var icono = nodo.querySelector(".ico");
        if (icono) icono.replaceWith(punto); else nodo.prepend(punto);
      }
      nodo.querySelector("span:not(.estado__punto)").textContent = e.texto;
    });
    // Fila de hoy y marca de la hora actual en la semana
    document.querySelectorAll(".semana li").forEach(function (li) {
      var esHoy = Number(li.getAttribute("data-dia")) === e.t.dia;
      li.classList.toggle("hoy", esHoy);
      var marca = li.querySelector(".semana__ahora");
      if (esHoy && e.t.h >= 9 && e.t.h <= 21) {
        if (!marca) {
          marca = document.createElement("span");
          marca.className = "semana__ahora";
          li.querySelector(".semana__barra").appendChild(marca);
        }
        marca.style.left = ((e.t.h - 9) / 12 * 100) + "%";
      } else if (marca) {
        marca.remove();
      }
    });
  }

  function initEstado() {
    pintaEstado();
    setInterval(pintaEstado, 60000);
  }

  // La nota: el texto se envía por WhatsApp y la hoja se arranca por el perforado
  function initNota() {
    var form = document.getElementById("nota");
    var hoja = document.getElementById("hoja");
    var aviso = document.getElementById("nota-aviso");
    if (!form || !hoja) return;
    var campo = form.querySelector("textarea");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var texto = campo.value.trim();
      var mensaje = texto ? SALUDO + "\n\n" + texto : SALUDO;
      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(mensaje);

      var enlace = document.createElement("a");
      enlace.href = url;
      enlace.target = "_blank";
      enlace.rel = "noopener";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      arranca(texto);
      form.reset();
      if (aviso) aviso.textContent = texto
        ? "Tu nota se ha abierto en WhatsApp: solo falta enviarla. Si no se abre, escríbenos al 648 053 976."
        : "Se ha abierto WhatsApp para escribirnos. Si no se abre, escríbenos al 648 053 976.";
    });

    function arranca(texto) {
      var original = hoja.querySelector(".hoja__arrancable");
      if (!original) return;
      var copia = original.cloneNode(true);
      copia.classList.add("hoja__copia");
      copia.setAttribute("aria-hidden", "true");
      copia.querySelectorAll("[id]").forEach(function (n) { n.removeAttribute("id"); });
      copia.querySelectorAll("a, button, textarea, input").forEach(function (n) { n.setAttribute("tabindex", "-1"); });
      var campoCopia = copia.querySelector("textarea");
      if (campoCopia) campoCopia.value = texto;
      hoja.appendChild(copia);
      // fuerza el estilo inicial antes de animar
      void copia.offsetWidth;
      copia.classList.add("se-va");
      var quitar = function () { if (copia.parentNode) copia.remove(); };
      copia.addEventListener("transitionend", quitar, { once: true });
      setTimeout(quitar, 1200);
    }
  }

  // Los enlaces «Apúntalo en la nota» suben a la hoja y dejan el cursor en el campo
  function initIrANota() {
    var campo = document.getElementById("nota-texto");
    if (!campo) return;
    document.querySelectorAll("[data-ir-nota]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        document.getElementById("hoja").scrollIntoView({ behavior: reducir ? "auto" : "smooth", block: "center" });
        setTimeout(function () { campo.focus({ preventScroll: true }); }, reducir ? 0 : 600);
      });
    });
  }

  // Menú en móvil
  function initMenu() {
    var boton = document.querySelector(".cabecera__abrir");
    var menu = document.getElementById("menu");
    if (!boton || !menu) return;
    var etiqueta = boton.querySelector(".sr");
    var uso = boton.querySelector("use");
    function pon(abierto) {
      menu.classList.toggle("abierto", abierto);
      boton.setAttribute("aria-expanded", String(abierto));
      if (etiqueta) etiqueta.textContent = abierto ? "Cerrar el menú" : "Abrir el menú";
      if (uso) uso.setAttribute("href", abierto ? "#i-cerrar" : "#i-menu");
    }
    boton.addEventListener("click", function () { pon(boton.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (ev) { if (ev.target.closest("a")) pon(false); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && boton.getAttribute("aria-expanded") === "true") { pon(false); boton.focus(); }
    });
    window.matchMedia("(min-width: 960px)").addEventListener("change", function (m) { if (m.matches) pon(false); });
  }

  // El logo de la barra aparece cuando la cabecera impresa de la hoja sale de la vista
  function initLogo() {
    var cabecera = document.getElementById("cabecera");
    var impresa = document.getElementById("hoja-cabecera");
    if (!cabecera) return;
    if (!impresa || !("IntersectionObserver" in window)) { cabecera.classList.add("cabecera--logo"); return; }
    new IntersectionObserver(function (entradas) {
      cabecera.classList.toggle("cabecera--logo", !entradas[0].isIntersecting);
    }, { rootMargin: "-64px 0px 0px 0px" }).observe(impresa);
  }

  // Sección activa en el menú
  function initSeccionActiva() {
    if (!("IntersectionObserver" in window)) return;
    var enlaces = {};
    document.querySelectorAll(".menu a[href^='#']").forEach(function (a) { enlaces[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        var a = enlaces[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          Object.keys(enlaces).forEach(function (k) { enlaces[k].removeAttribute("aria-current"); });
          a.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(enlaces).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  // Apariciones al bajar; lo que ya está a la vista se muestra sin esperar
  function initApariciones() {
    var nodos = Array.prototype.slice.call(document.querySelectorAll(".aparece, .destapa"));
    function muestra(n) { n.classList.add("visible"); }
    if (raiz.classList.contains("captura") || !("IntersectionObserver" in window)) { nodos.forEach(muestra); return; }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { muestra(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -6% 0px" });
    nodos.forEach(function (n) { io.observe(n); });
    // Red de seguridad: si algo visible se quedó oculto, se muestra
    setTimeout(function () {
      nodos.forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) muestra(n);
      });
    }, 6000);
    window.addEventListener("beforeprint", function () { nodos.forEach(muestra); });
  }

  function arranque() {
    safe(initEstado, "estado");
    safe(initNota, "nota");
    safe(initIrANota, "ir a la nota");
    safe(initMenu, "menú");
    safe(initLogo, "logo");
    safe(initSeccionActiva, "sección activa");
    safe(initApariciones, "apariciones");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arranque);
  else arranque();
})();
