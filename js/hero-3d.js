/* hero-3d.js — lightweight Three.js hero layer + card tilt (no build step).
 * Respects prefers-reduced-motion, pauses off-screen/hidden tab, DPR capped at 2.
 * Requires window.THREE (js/vendor-three.min.js loaded before this file). */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 3D hero canvas ---------- */
  function initHero3D() {
    var canvas = document.getElementById("hero-3d");
    if (!canvas || !window.THREE) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    var CYAN = 0x38e1ff;
    var BLUE = 0x2563eb;

    // Particle starfield
    var COUNT = 650;
    var pos = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var points = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: CYAN, size: 0.045, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(points);

    // Wireframe icosahedron hero shape (right side)
    var ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.1, 1),
      new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35 })
    );
    ico.position.set(3.4, 0.4, -1);
    scene.add(ico);

    // Inner solid core, very dim
    var core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 1),
      new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: 0.5 })
    );
    core.position.copy(ico.position);
    scene.add(core);

    // Small torus accent (left side)
    var torus = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.28, 12, 40),
      new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: 0.3 })
    );
    torus.position.set(-4.2, -0.8, -2);
    scene.add(torus);

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Keep shapes framed on narrow screens
      var s = w < 640 ? 0.7 : 1;
      ico.scale.set(s, s, s);
      core.scale.set(s, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    // Mouse parallax (desktop, fine pointers only)
    var mx = 0, my = 0, fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (fine && !reduceMotion) {
      window.addEventListener("mousemove", function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    var heroVisible = true;
    var hero = document.querySelector(".hero");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(hero);
    }

    var t = 0;
    function frame() {
      t += 0.005;
      points.rotation.y = t * 0.25;
      points.position.y = Math.sin(t * 0.8) * 0.15;
      ico.rotation.x = t * 0.4;
      ico.rotation.y = t * 0.6;
      core.rotation.x = -t * 0.5;
      core.rotation.y = -t * 0.35;
      torus.rotation.x = t * 0.3;
      torus.rotation.z = t * 0.2;
      camera.position.x += ((mx * 0.6) - camera.position.x) * 0.04;
      camera.position.y += ((-my * 0.4) - camera.position.y) * 0.04;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }

    if (reduceMotion) { frame(); return; } // single static frame

    (function loop() {
      requestAnimationFrame(loop);
      if (document.hidden || !heroVisible) return;
      frame();
    })();
  }

  /* ---------- Subtle 3D tilt on service cards ---------- */
  function initTilt() {
    if (reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia("(pointer: fine)").matches)) return;
    var cards = document.querySelectorAll("#services-grid .card, .grid .card");
    cards.forEach(function (card) {
      card.style.transformStyle = "preserve-3d";
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -8;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
        card.style.transform = "perspective(700px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-2px)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initHero3D(); initTilt(); });
  } else {
    initHero3D(); initTilt();
  }
})();
