/**
 * main.js — Script for Jerónimo Gutiérrez Balanta
 */

// Dropdown is entirely handled by CSS :hover and :focus-within now

// Canvas animation code (disabled by default based on previous configuration)
function initAnimation() {
    const canvas = document.getElementById('portfolio-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Sizing the canvas
    let width, height;
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Virtual Scroll tracking
    let targetScrollY = 0;
    let currentScrollY = 0;

    // Setup dimensions and year configuration
    const orbitRadius = 250;
    const SCROLL_SENSITIVITY = 0.002;
    const SPACING = 0.35; // Angle between years
    const topAxis = -Math.PI / 2; // Center top of the orbit

    // Generate years 2026 to 2017
    const elements = [];
    for (let i = 0; i < 10; i++) {
        elements.push({
            year: (2026 - i).toString(),
            startAngle: topAxis - (i * SPACING)
        });
    }

    // Scroll Bounds
    const minScrollY = 0;
    const maxScrollY = ((elements.length - 1) * SPACING) / SCROLL_SENSITIVITY;

    // Listen for wheel events on window
    window.addEventListener('wheel', (e) => {
        let delta = e.deltaY;
        let potentialScroll = targetScrollY + delta;
        if (potentialScroll < minScrollY || potentialScroll > maxScrollY) delta *= 0.1; // iOS Rubber Band
        targetScrollY += delta;
    }, { passive: true });

    // Touch support for mobile
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        let delta = (touchStartY - touchY) * 2;
        touchStartY = touchY;

        let potentialScroll = targetScrollY + delta;
        if (potentialScroll < minScrollY || potentialScroll > maxScrollY) delta *= 0.1; // iOS Rubber Band
        targetScrollY += delta;
    }, { passive: true });

    const starFixedAngle = -Math.PI / 6;

    function draw() {
        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2 + 500;

        // Snap back spring for out-of-bounds targetScrollY
        if (targetScrollY < minScrollY) {
            targetScrollY += (minScrollY - targetScrollY) * 0.1;
        } else if (targetScrollY > maxScrollY) {
            targetScrollY += (maxScrollY - targetScrollY) * 0.1;
        }

        // Smooth the scroll
        currentScrollY += (targetScrollY - currentScrollY) * 0.08;

        const time = Date.now() / 1000;
        const breath = Math.sin(time * 2) * 15;
        const gradRadius = 220 + breath;

        // 1. BREATHING GRADIENT
        const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, gradRadius);
        grad.addColorStop(0, "rgba(165, 155, 255, 1)");
        grad.addColorStop(0.5, "rgba(185, 175, 255, 0.7)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, gradRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. ORBIT PATH
        ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 3. SCROLLING VECTOR ELEMENTS
        const scrollAngleOffset = currentScrollY * SCROLL_SENSITIVITY;
        const fadeDistance = Math.PI / 4;

        elements.forEach((item) => {
            const currentAngle = item.startAngle + scrollAngleOffset;

            // Fade Logic: It fades out as it moves right (past topAxis)
            const pastTop = currentAngle - topAxis;

            let opacity = 1;
            if (pastTop > 0) {
                // Fading out after crossing the top
                opacity = 1 - (pastTop / fadeDistance);
            } else if (pastTop < -Math.PI) {
                // Far left (fade on the opposite side to keep it clean)
                opacity = 1 - (Math.abs(pastTop + Math.PI) / fadeDistance);
            }
            opacity = Math.max(0, Math.min(1, opacity));

            // Determine if active (within ~10 degrees of topAxis)
            const distFromTop = Math.abs(currentAngle - topAxis);
            const isActive = distFromTop < 0.17;

            if (opacity > 0) {
                const px = centerX + Math.cos(currentAngle) * orbitRadius;
                const py = centerY + Math.sin(currentAngle) * orbitRadius;

                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(currentAngle + Math.PI / 2);

                ctx.globalAlpha = opacity;
                ctx.lineWidth = 1;

                if (isActive) {
                    ctx.fillStyle = "#606060ff"; // Black active fill
                    ctx.strokeStyle = "#111"; // Black outline
                } else {
                    ctx.fillStyle = "transparent"; // Default empty fill
                    ctx.strokeStyle = "#888"; // Outline only
                }

                // Draw Capsule Base
                ctx.beginPath();
                ctx.roundRect(-35, -18, 70, 36, 18);
                if (isActive) ctx.fill();
                ctx.stroke();

                // Draw Text inside capsule
                ctx.font = isActive ? "500 14px 'Inter', sans-serif" : "300 14px 'Inter', sans-serif";
                ctx.fillStyle = isActive ? "#FFF" : "#888";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(item.year, 0, 0);

                ctx.restore();
            }
        });

        // 4. ROTATING STAR 
        const starX = centerX + Math.cos(starFixedAngle) * orbitRadius;
        const starY = centerY + Math.sin(starFixedAngle) * orbitRadius;
        const starRotation = currentScrollY * 0.008;

        ctx.save();
        ctx.translate(starX, starY);
        ctx.rotate(starRotation);
        ctx.fillStyle = "#cceb54";

        ctx.beginPath();
        const points = 16;
        for (let i = 0; i < points; i++) {
            const radius = (i % 2 === 0) ? 22 : 9;
            const angle = (i * Math.PI) / 8;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        requestAnimationFrame(draw);
    }

    draw();
}

// Boot
if (document.readyState === 'loading') {
    // document.addEventListener('DOMContentLoaded', initAnimation);
} else {
    // initAnimation();
}
