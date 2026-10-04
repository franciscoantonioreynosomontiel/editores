/**
 * Layers and Editable Templates Manager for 2D/3D Customizer
 * Provides Illustrator-like layer management and JSON template storage per product type.
 */
(function(window) {
    'use strict';

    function LayersTemplateManager(config) {
        this.canvas = config.canvas; // Fabric.js canvas instance
        this.productKey = config.productKey || 'default'; // e.g., 'shirt', 'banner', 'flag', 'sticker', 'xbanner'
        this.onUpdateTexture = config.onUpdateTexture || function() {};

        this.layersContainer = document.getElementById(config.layersContainerId || 'layers-list');
        this.templatesContainer = document.getElementById(config.templatesContainerId || 'saved-templates-grid');
        this.saveTemplateBtn = document.getElementById(config.saveTemplateBtnId || 'save-template-btn');

        this.init();
    }

    LayersTemplateManager.prototype.init = function() {
        if (!this.canvas) return;

        this.bindCanvasEvents();
        this.bindTemplateEvents();
        this.renderLayers();
        this.loadSavedTemplatesUI();
    };

    LayersTemplateManager.prototype.bindCanvasEvents = function() {
        var self = this;
        var events = ['object:added', 'object:removed', 'object:modified', 'selection:created', 'selection:updated', 'selection:cleared'];

        events.forEach(function(evt) {
            self.canvas.on(evt, function() {
                self.renderLayers();
            });
        });
    };

    LayersTemplateManager.prototype.bindTemplateEvents = function() {
        var self = this;
        if (this.saveTemplateBtn) {
            this.saveTemplateBtn.addEventListener('click', function() {
                self.saveCurrentTemplate();
            });
        }
    };

    /**
     * Get object display name and icon
     */
    LayersTemplateManager.prototype.getObjectMeta = function(obj, index) {
        var type = obj.type;
        var name = obj.layerName || '';
        var icon = 'fa-cube';

        if (type === 'i-text' || type === 'text') {
            icon = 'fa-font';
            if (!name) name = obj.text ? (obj.text.length > 15 ? obj.text.substring(0, 15) + '...' : obj.text) : 'Texto';
        } else if (type === 'image') {
            icon = 'fa-image';
            if (!name) name = 'Imagen ' + index;
        } else if (type === 'rect') {
            icon = 'fa-square';
            if (!name) name = 'Rectángulo ' + index;
        } else if (type === 'circle') {
            icon = 'fa-circle';
            if (!name) name = 'Círculo ' + index;
        } else if (type === 'triangle') {
            icon = 'fa-play';
            if (!name) name = 'Triángulo ' + index;
        } else if (type === 'path') {
            icon = 'fa-draw-polygon';
            if (!name) name = 'Trazado ' + index;
        } else {
            if (!name) name = 'Capa ' + index;
        }

        return { name: name, icon: icon };
    };

    /**
     * Render layers list in Illustrator-style (topmost canvas object first)
     */
    LayersTemplateManager.prototype.renderLayers = function() {
        if (!this.layersContainer) return;

        var self = this;
        var objects = this.canvas.getObjects();
        var activeObject = this.canvas.getActiveObject();

        this.layersContainer.innerHTML = '';

        if (objects.length === 0) {
            this.layersContainer.innerHTML = '<div style="text-align:center; color:#888; padding:15px; font-size:13px;"><i class="fas fa-layer-group" style="font-size:24px; margin-bottom:5px; display:block;"></i>No hay capas en el canvas</div>';
            return;
        }

        // Standard graphics editor order: top layer in UI corresponds to top object in canvas stack
        for (var i = objects.length - 1; i >= 0; i--) {
            (function(index) {
                var obj = objects[index];
                if (obj.isTemplateBackground || obj.excludeFromLayers) return;

                var meta = self.getObjectMeta(obj, index + 1);
                var isSelected = activeObject === obj;

                var item = document.createElement('div');
                item.className = 'layer-item' + (isSelected ? ' selected' : '');
                item.setAttribute('data-index', index);

                // Role choices for Gemini/Platform integration
                var currentRole = obj.customRole || '';

                var html = '';
                html += '<div class="layer-main">';
                html += '  <button class="layer-btn layer-vis" title="Visibilidad"><i class="fas ' + (obj.visible !== false ? 'fa-eye' : 'fa-eye-slash') + '"></i></button>';
                html += '  <i class="fas ' + meta.icon + ' layer-type-icon"></i>';
                html += '  <span class="layer-title">' + self.escapeHtml(meta.name) + '</span>';
                html += '  <div class="layer-actions">';
                html += '    <button class="layer-btn layer-up" title="Mover arriba"><i class="fas fa-chevron-up"></i></button>';
                html += '    <button class="layer-btn layer-down" title="Mover abajo"><i class="fas fa-chevron-down"></i></button>';
                html += '    <button class="layer-btn layer-lock" title="Bloquear"><i class="fas ' + (obj.lockMovementX ? 'fa-lock' : 'fa-lock-open') + '"></i></button>';
                html += '    <button class="layer-btn layer-del" title="Eliminar"><i class="fas fa-trash-alt"></i></button>';
                html += '  </div>';
                html += '</div>';

                // Role Selector for Gemini / Platform Data Binding
                html += '<div class="layer-role-row">';
                html += '  <label><i class="fas fa-tag"></i> Rol / ID:</label>';
                html += '  <select class="layer-role-select">';
                html += '    <option value=""' + (currentRole === '' ? ' selected' : '') + '>Sin Etiqueta</option>';
                html += '    <option value="Titulo"' + (currentRole === 'Titulo' ? ' selected' : '') + '>Título</option>';
                html += '    <option value="Platillo"' + (currentRole === 'Platillo' ? ' selected' : '') + '>Platillo / Producto</option>';
                html += '    <option value="Address"' + (currentRole === 'Address' ? ' selected' : '') + '>Address / Dirección</option>';
                html += '    <option value="Slogan"' + (currentRole === 'Slogan' ? ' selected' : '') + '>Slogan</option>';
                html += '    <option value="Precio"' + (currentRole === 'Precio' ? ' selected' : '') + '>Precio</option>';
                html += '    <option value="Logo"' + (currentRole === 'Logo' ? ' selected' : '') + '>Logo</option>';
                html += '    <option value="custom"' + (currentRole && !['Titulo','Platillo','Address','Slogan','Precio','Logo'].includes(currentRole) ? ' selected' : '') + '>Personalizado...</option>';
                html += '  </select>';
                if (currentRole && !['Titulo','Platillo','Address','Slogan','Precio','Logo',''].includes(currentRole)) {
                    html += '  <input type="text" class="layer-role-custom" value="' + self.escapeHtml(currentRole) + '" placeholder="Ej. Promoción" />';
                } else {
                    html += '  <input type="text" class="layer-role-custom" style="display:none;" placeholder="Ej. Promoción" />';
                }
                html += '</div>';

                item.innerHTML = html;

                // Event Listeners for Layer Item Controls
                item.querySelector('.layer-main').addEventListener('click', function(e) {
                    if (e.target.closest('.layer-btn')) return; // Ignore button clicks
                    self.canvas.setActiveObject(obj);
                    self.canvas.renderAll();
                    self.renderLayers();
                });

                // Toggle Visibility
                item.querySelector('.layer-vis').addEventListener('click', function(e) {
                    e.stopPropagation();
                    obj.set('visible', obj.visible === false ? true : false);
                    self.canvas.renderAll();
                    self.onUpdateTexture();
                    self.renderLayers();
                });

                // Reorder Up (Bring Forward)
                item.querySelector('.layer-up').addEventListener('click', function(e) {
                    e.stopPropagation();
                    self.canvas.bringForward(obj);
                    self.canvas.renderAll();
                    self.onUpdateTexture();
                    self.renderLayers();
                });

                // Reorder Down (Send Backwards)
                item.querySelector('.layer-down').addEventListener('click', function(e) {
                    e.stopPropagation();
                    self.canvas.sendBackwards(obj);
                    self.canvas.renderAll();
                    self.onUpdateTexture();
                    self.renderLayers();
                });

                // Toggle Lock
                item.querySelector('.layer-lock').addEventListener('click', function(e) {
                    e.stopPropagation();
                    var isLocked = !obj.lockMovementX;
                    obj.set({
                        lockMovementX: isLocked,
                        lockMovementY: isLocked,
                        lockRotation: isLocked,
                        lockScalingX: isLocked,
                        lockScalingY: isLocked,
                        hasControls: !isLocked
                    });
                    self.canvas.renderAll();
                    self.renderLayers();
                });

                // Delete Layer
                item.querySelector('.layer-del').addEventListener('click', function(e) {
                    e.stopPropagation();
                    self.canvas.remove(obj);
                    self.canvas.discardActiveObject();
                    self.canvas.renderAll();
                    self.onUpdateTexture();
                    self.renderLayers();
                });

                // Role Select Change
                var roleSelect = item.querySelector('.layer-role-select');
                var roleCustom = item.querySelector('.layer-role-custom');

                roleSelect.addEventListener('change', function(e) {
                    var val = e.target.value;
                    if (val === 'custom') {
                        roleCustom.style.display = 'inline-block';
                        roleCustom.focus();
                        obj.customRole = roleCustom.value || 'CustomRole';
                    } else {
                        roleCustom.style.display = 'none';
                        obj.customRole = val;
                    }
                });

                roleCustom.addEventListener('input', function(e) {
                    obj.customRole = e.target.value;
                });

                self.layersContainer.appendChild(item);
            })(i);
        }
    };

    /**
     * Admin Save Current Canvas as Editable Template (JSON)
     */
    LayersTemplateManager.prototype.saveCurrentTemplate = function() {
        var title = prompt('Ingrese el nombre de la plantilla editable (Admin):', 'Plantilla ' + new Date().toLocaleTimeString());
        if (!title || !title.trim()) return;

        var activeObj = this.canvas.getActiveObject();
        if (activeObj) {
            activeObj.set({ hasControls: false, hasBorders: false });
            this.canvas.renderAll();
        }

        // Export Fabric Canvas JSON with custom metadata attributes
        var json = this.canvas.toJSON(['customRole', 'layerName', 'id', 'lockMovementX', 'lockMovementY', 'lockRotation', 'lockScalingX', 'lockScalingY']);
        var thumbnail = this.canvas.toDataURL({ format: 'png', quality: 0.8, multiplier: 0.3 });

        if (activeObj) {
            activeObj.set({ hasControls: true, hasBorders: true });
            this.canvas.setActiveObject(activeObj);
            this.canvas.renderAll();
        }

        var templateData = {
            id: 'template_' + Date.now(),
            title: title.trim(),
            productKey: this.productKey,
            createdAt: new Date().toISOString(),
            thumbnail: thumbnail,
            json: json
        };

        var key = 'custom_templates_' + this.productKey;
        var existing = [];
        try {
            var raw = localStorage.getItem(key);
            if (raw) existing = JSON.parse(raw);
        } catch(e) {
            console.error('Error reading saved templates:', e);
        }

        existing.push(templateData);
        localStorage.setItem(key, JSON.stringify(existing));

        alert('¡Plantilla editable guardada correctamente!');
        this.loadSavedTemplatesUI();
    };

    /**
     * Load saved editable templates UI into #saved-templates-grid
     */
    LayersTemplateManager.prototype.loadSavedTemplatesUI = function() {
        if (!this.templatesContainer) return;

        var self = this;
        var key = 'custom_templates_' + this.productKey;
        var templates = [];

        try {
            var raw = localStorage.getItem(key);
            if (raw) templates = JSON.parse(raw);
        } catch(e) {
            console.error('Error loading saved templates:', e);
        }

        this.templatesContainer.innerHTML = '';

        if (templates.length === 0) {
            this.templatesContainer.innerHTML = '<div style="grid-column: 1 / -1; font-size:12px; color:#888; text-align:center; padding:10px;">No hay plantillas editables guardadas.</div>';
            return;
        }

        templates.forEach(function(tpl) {
            var card = document.createElement('div');
            card.className = 'template-btn saved-template-card';
            card.title = tpl.title;

            var html = '';
            html += '<div class="template-shape shape-rect" style="background:#fff; border:1px solid #ff8c00; position:relative; overflow:hidden;">';
            html += '  <img src="' + tpl.thumbnail + '" alt="' + self.escapeHtml(tpl.title) + '" style="width:100%; height:100%; object-fit:cover;" />';
            html += '  <button class="delete-tpl-btn" title="Eliminar plantilla" style="position:absolute; top:2px; right:2px; background:rgba(255,0,0,0.8); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; line-height:18px; padding:0;">&times;</button>';
            html += '</div>';
            html += '<span style="font-size:11px; font-weight:bold; color:#333; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + self.escapeHtml(tpl.title) + '</span>';

            card.innerHTML = html;

            // Load template on click
            card.querySelector('.template-shape').addEventListener('click', function(e) {
                if (e.target.classList.contains('delete-tpl-btn')) return;
                self.loadTemplateJSON(tpl.json);
            });

            // Delete template on click
            card.querySelector('.delete-tpl-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('¿Desea eliminar esta plantilla?')) {
                    self.deleteTemplate(tpl.id);
                }
            });

            self.templatesContainer.appendChild(card);
        });
    };

    /**
     * Load JSON template into Fabric canvas
     */
    LayersTemplateManager.prototype.loadTemplateJSON = function(jsonData) {
        var self = this;
        this.canvas.clear();

        this.canvas.loadFromJSON(jsonData, function() {
            self.canvas.renderAll();
            self.renderLayers();
            self.onUpdateTexture();
        });
    };

    /**
     * Delete saved template by ID
     */
    LayersTemplateManager.prototype.deleteTemplate = function(templateId) {
        var key = 'custom_templates_' + this.productKey;
        try {
            var raw = localStorage.getItem(key);
            if (raw) {
                var templates = JSON.parse(raw);
                var filtered = templates.filter(function(t) { return t.id !== templateId; });
                localStorage.setItem(key, JSON.stringify(filtered));
                this.loadSavedTemplatesUI();
            }
        } catch(e) {
            console.error('Error deleting template:', e);
        }
    };

    LayersTemplateManager.prototype.escapeHtml = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    window.LayersTemplateManager = LayersTemplateManager;

})(window);
