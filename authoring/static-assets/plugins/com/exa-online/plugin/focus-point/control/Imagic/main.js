/*
 * Copyright (C) 2007-2022 Crafter Software Corporation. All Rights Reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as published by
 * the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

CStudioForms.Controls.Imagic =
  CStudioForms.Controls.Imagic ||
  function (id, form, owner, properties, constraints, readonly) {
    this.owner = owner;
    this.owner.registerField(this);
    this.errors = [];
    this.properties = properties;
    this.constraints = constraints;
    this.inputEl = null;
    this.required = false;
    this.value = '_not-set';
    this.form = form;
    this.id = id;
    this.datasources = null;
    this.upload_dialog = null;
    this.crop_dialog = null;
    this.validExtensions = ['jpg', 'jpeg', 'gif', 'png', 'tiff', 'tif', 'bmp', 'svg', 'jp2', 'jxr', 'webp'];
    this.readonly = readonly;
    this.predefinedFocuspointX = 0.5;
    this.predefinedFocuspointY = 0.5;
    this.focuspoint_x = this.predefinedFocuspointX;
    this.focuspoint_y = this.predefinedFocuspointY;
    this.originalWidth = null;
    this.originalHeight = null;
    this.previewBoxHeight = 100;
    this.previewBoxWidth = 300;
    this.external = null;
    this.supportedPostFixes = ['_s'];

    return this;
  };

YAHOO.extend(CStudioForms.Controls.Imagic, CStudioForms.CStudioFormField, {
  getLabel: function() {
    return "Imagic";
  },

  _onChange: function (evt, obj) {
    obj.value = obj.inputEl.value;
    
    if (obj.required) {
      if (obj.inputEl.value === '') {
        obj.setError('required', 'Field is Required');
        obj.renderValidation(true, false);
      } else {
        obj.clearError('required');
        obj.renderValidation(true, true);
      }
    } else {
      obj.renderValidation(false, true);
    }

    if (obj.value !== '') {
      var index = obj.value.indexOf("?");
      if (index >= 0) {
        obj.value = obj.value.substring(0, index);
      }
      obj.value = obj.value + '?focuspoint_x=' + this.focuspoint_x.toString() + '&focuspoint_y=' + this.focuspoint_y.toString();
    }

    obj.owner.notifyValidation();
    obj.form.updateModel(obj.id, obj.getValue(), obj.remote);
  },

  /**
   * 
   * @param {evt} new image loaded
   * @param {*} obj 
   */
  _onChangeVal: function (evt, obj) {
    obj.edited = true;
    this.focuspoint_x = this.predefinedFocuspointX;
    this.focuspoint_y = this.predefinedFocuspointY;
    this._updateFocusPoint(this.focuspoint_x, this.focuspoint_y);
    this._updateReticlePosition(document.getElementById('focuspoint-target-overlay'), this.focuspoint_x, this.focuspoint_y, true);
    this._onChange(evt, obj);
  },

  /**
   * move focuspoint (triggered by click on image)
   * @param {*} imageElement 
   * @param {*} pageX 
   * @param {*} pageY 
   */
  _moveFocuspoint: function (imageElement, pageX, pageY) {
    var imageW = imageElement.width;
    var imageH = imageElement.height;

    // calculate FocusPoint coordinates
    var offsetX = pageX - imageElement.offsetLeft;
    var offsetY = pageY - imageElement.offsetTop;
    var focusX = (offsetX / imageW);
    var focusY = (offsetY / imageH);

    this._updateFocusPoint(focusX, focusY);
    this._updateReticlePosition(imageElement, focusX, focusY);
  },

  /**
   * Update focus point label (textual feedback)
   * @param {*} focusX 
   * @param {*} focusY 
   */
  _updateFocusPoint: function (focusX, focusY) {
    this.focuspoint_x = focusX;
    this.focuspoint_y = focusY;
    var outputValue = document.getElementById('focuspoint-coords');

    if (outputValue) {
      outputValue.innerHTML = focusX.toFixed(3) + " x " + focusY.toFixed(3); 
    }
  },

  /**
   * update the reticle in the image positioned in the focus point (visual feedback)
   * @param {*} imageElement 
   * @param {*} focusX 
   * @param {*} focusY 
   * @param {*} init 
   */
  _updateReticlePosition: function (imageElement, focusX, focusY, init) {
    if (imageElement) {
      var reticle = imageElement.parentNode.querySelector('#focuspoint');
      if (reticle) {
        var imageW = imageElement.width;
        var imageH = imageElement.height;
        if (imageW <= 0 || imageH <= 0) {
          imageW = this.originalWidth;
          imageH = this.originalHeight;
        }

        // animate movement of focuspoint
        if (!init) {
          reticle.style.transition = 'all 500ms ease-in-out';
          reticle.style['-webkit-transition'] = 'all 500ms ease-in-out';
          reticle.style['-moz-transition'] = 'all 500ms ease-in-out';
        } else {
          reticle.style.transition = 'none';
        }
     
        var offsetX = focusX - 0.1;
        var percentageX = Math.max(0, Math.min(80, offsetX * 100));
        var percentageY = 50;

        if (imageW > 0 && imageH > 0) {
          // limit to max bottom, max right so that's not positioned outside of the image
          var pixW = imageW * 0.10;
          var perH = pixW / imageH;
          var offsetY = focusY - perH;
          percentageY = Math.max(0, Math.min(100 - (200*perH), offsetY * 100));
        }

        reticle.style.top = percentageY + '%';
        reticle.style.left = percentageX + '%';
      }
    }
  },

  /**
   * perform count calculation on keypress
   * @param evt event
   * @param el element
   */
  count: function (evt, countEl, el) {},

  /**
   * Aspect Ratios
   */
  calculateAspectRatioFit: function (srcWidth, srcHeight, maxWidth, maxHeight) {
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

    return { width: srcWidth * ratio, height: srcHeight * ratio };
  },

  /**
   * create dialog
   */
  createDialog: function () {
    let url = this.inputEl.value;
    craftercms.getStore().dispatch({
      type: 'SHOW_PREVIEW_DIALOG',
      payload: {
        type: 'image',
        title: CrafterCMSNext.util.path.getFileNameFromPath(url),
        url
      }
    });
  },

  /**
   * event fired when the full is pressed
   */
  fullImageTab: function (url) {
    window.open(url);
  },

  /**
   * event fired when the ok is pressed
   */
  uploadPopupCancel: function (event) {
    this.upload_dialog.destroy();
  },

  showAlert: function (message) {
    var self = this;
    var dialog = new YAHOO.widget.SimpleDialog('alertDialog', {
      width: '400px',
      fixedcenter: true,
      visible: false,
      draggable: false,
      close: false,
      modal: true,
      text: message,
      icon: YAHOO.widget.SimpleDialog.ICON_ALARM,
      constraintoviewport: true,
      buttons: [
        {
          text: 'OK',
          handler: function () {
            this.destroy();
            CStudioAuthoring.Utils.decreaseFormDialog();
          },
          isDefault: false
        }
      ]
    });
    dialog.setHeader('CStudio Warning');
    dialog.render(document.body);
    dialog.show();
    dialog.innerElement.parentElement.style.setProperty('z-index', '100104', 'important');
  },

  cropPopupCancel: function (event) {
    this.crop_dialog.destroy();
    CStudioAuthoring.Utils.decreaseFormDialog();
  },

  setImageData: function (imagePicker, imageData) {
    let CMgs = CStudioAuthoring.Messages;
    let langBundle = CMgs.getBundle('contentTypes', CStudioAuthoringContext.lang);
    imagePicker.inputEl.value = imageData.relativeUrl;

    imagePicker.previewEl.src = imageData.previewUrl.replace(/ /g, '%20') + '?' + new Date().getTime();
    imagePicker.urlEl.textContent = imageData.relativeUrl.replace('?crafterCMIS=true', '');
    imagePicker.downloadEl.href = imageData.previewUrl;
    imagePicker.remote = imageData.remote && imageData.remote === true ? true : false;

    imagePicker.$addBtn.text(CMgs.format(langBundle, 'replace'));

    imagePicker.noPreviewEl.style.display = 'none';
    imagePicker.noPreviewEl.parentElement.classList.remove('no-selection');
    imagePicker.previewEl.style.display = 'inline';
    YAHOO.util.Dom.addClass(imagePicker.previewEl, 'cstudio-form-control-asset-picker-preview-content');

    // imagePicker.adjustImage();

    imagePicker._onChangeVal(null, imagePicker);
  },

  increaseFormDialogForCrop: function () {
    var id = window.frameElement.getAttribute('id').split('-editor-')[1];
    var getFormSizeVal = typeof getFormSize === 'function' ? getFormSize : parent.getFormSize;
    var setFormSizeVal = typeof setFormSize === 'function' ? setFormSize : parent.setFormSize;
    var formSize = getFormSizeVal(id);
    if (formSize < 557) {
      setFormSizeVal(557, id);
    }
  },

  addImage: function () {
    var _self = this;
    var imageManagerNames = this.datasources;

    imageManagerNames = !imageManagerNames
      ? ''
      : Array.isArray(imageManagerNames)
      ? imageManagerNames.join(',')
      : imageManagerNames;
    var datasourceMap = this.form.datasourceMap,
      datasourceDef = this.form.definition.datasources;

    if (imageManagerNames !== '') {
      // The datasource title is only found in the definition.datasources. It'd make more sense to have all
      // the information in just one place.
      datasourceDef.forEach(function (el) {
        // We want to avoid possible substring conflicts by using a reg exp (a simple indexOf
        // would fail if a datasource id string is a substring of another datasource id)
        var mapDatasource;
        if (imageManagerNames.indexOf(el.id) !== -1) {
          mapDatasource = datasourceMap[el.id];
          const $itemEl = $(`<li><a class="cstudio-form-control-image-picker-add-container-item">${el.title}</a></li>`);
          _self.$dropdownMenu.append($itemEl);
          $itemEl.on('click', function () {
            _self._addImage(mapDatasource);
          });
        }
      });
    }
  },

  _addImage: function (datasourceEl) {
    if (datasourceEl && datasourceEl.insertImageAction) {
      var self = this;
      datasourceEl.insertImageAction({
        imagePicker: this,
        success: function (imageData, repoImage) {
          var valid = false,
            message = '',
            repoImage;

          if (this.imagePicker.validExtensions.includes(imageData.fileExtension?.toLowerCase().trim())) {
            valid = true;
          } else {
            message = 'The uploaded file is not of type image';
          }

          if (!valid) {
            this.imagePicker.showAlert(message);
          } else {
            var image = new Image();
            var imagePicker = this.imagePicker;

            function imageLoaded() {

              imagePicker.originalWidth = this.width;
              imagePicker.originalHeight = this.height;

              // new image loaded, reset focus point
              self.focuspoint_x = self.predefinedFocuspointX;
              self.focuspoint_y = self.predefinedFocuspointY;

              var formContainer = this.form ? this.form.containerEl : self.form.containerEl;
              if ($(formContainer).find('#ice-body .cstudio-form-field-container').length > 1) {
                if (this.setImageData) {
                  this.setImageData(imagePicker, imageData);
                } else {
                  self.setImageData(imagePicker, imageData);
                }
              } else {
                if (this.setImageData) {
                  this.setImageData(imagePicker, imageData);
                  CStudioAuthoring.Utils.decreaseFormDialog();
                } else {
                  self.setImageData(imagePicker, imageData);
                  CStudioAuthoring.Utils.decreaseFormDialog();
                }
              }
            }
            image.addEventListener('load', imageLoaded, false);
            image.addEventListener('error', function () {
              message = 'Unable to load the selected image. Please try again or select another image';
              imagePicker.showAlert(message);
            });
            CStudioAuthoring.Operations.getImageRequest({
              url: imageData.previewUrl,
              image: image
            });
          }
        },
        failure: function (message) {
          this.imagePicker.showAlert(message);
        }
      });
    }
  },

  deleteImage: function () {
    var CMgs = CStudioAuthoring.Messages;
    var langBundle = CMgs.getBundle('contentTypes', CStudioAuthoringContext.lang);

    if (this.addContainerEl) {
      addContainerEl = this.addContainerEl;
      this.addContainerEl = null;
      this.ctrlOptionsEl.removeChild(addContainerEl);
    }

    if (this.inputEl.value !== '') {
      this.inputEl.value = '';
      this.urlEl.innerHTML = '';
      this.previewEl.style.display = 'none';
      this.previewEl.src = '';
      this.noPreviewEl.style.display = 'inline';
      this.noPreviewEl.parentElement.classList.add('no-selection');
      this.$addBtn.text(CMgs.format(langBundle, 'add'));
      this.remote = false;

      this.downloadEl.style.display = 'none';
      this.zoomEl.style.display = 'none';

      this.originalWidth = null;
      this.originalHeight = null;
      this.focuspoint_x = this.predefinedFocuspointX;
      this.focuspoint_y = this.predefinedFocuspointY;
      this._updateFocusPoint(this.focuspoint_x, this.focuspoint_y);
      YAHOO.util.Dom.addClass(this.previewEl, 'cstudio-form-control-asset-picker-preview-content');

      this._onChangeVal(null, this);
    }
  },

  render: function (config, containerEl) {
    containerEl.id = this.id;
    var divPrefix = config.id + '-';

    var CMgs = CStudioAuthoring.Messages;
    var langBundle = CMgs.getBundle('contentTypes', CStudioAuthoringContext.lang);

    this.containerEl = containerEl;

    // we need to make the general layout of a control inherit from common
    // you should be able to override it -- but most of the time it wil be the same
    var titleEl = document.createElement('span');

    YAHOO.util.Dom.addClass(titleEl, 'cstudio-form-field-title');
    titleEl.textContent = config.title;

    var controlWidgetContainerEl = document.createElement('div');
    YAHOO.util.Dom.addClass(controlWidgetContainerEl, 'cstudio-form-control-image-picker-container');

    var validEl = document.createElement('span');
    YAHOO.util.Dom.addClass(validEl, 'validation-hint');
    YAHOO.util.Dom.addClass(validEl, 'cstudio-form-control-validation fa fa-check');

    var inputEl = document.createElement('input');
    this.inputEl = inputEl;
    inputEl.disabled = true;
    inputEl.placeholder = '(Path)';
    YAHOO.util.Dom.addClass(inputEl, 'datum cstudio-form-control-input');
    inputEl.style.marginBottom = '5px';
    controlWidgetContainerEl.appendChild(inputEl);

    var imgInfoContainer = document.createElement('div');
    YAHOO.util.Dom.addClass(imgInfoContainer, 'imgInfoContainer');
    imgInfoContainer.style.width = '100%';
    controlWidgetContainerEl.appendChild(imgInfoContainer);

    var urlEl = document.createElement('div');
    this.urlEl = urlEl;
    urlEl.textContent = this.inputEl.value;
    urlEl.style.display = 'none';
    YAHOO.util.Dom.addClass(urlEl, 'info');
    imgInfoContainer.appendChild(urlEl);

    var bodyEl = document.createElement('div');
    YAHOO.util.Dom.addClass(bodyEl, 'cstudio-form-control-asset-picker-body');
    imgInfoContainer.appendChild(bodyEl);

    var imageEl = document.createElement('div');
    this.imageEl = imageEl;
    imageEl.id = divPrefix + 'cstudio-form-image-picker';
    YAHOO.util.Dom.addClass(imageEl, 'cstudio-form-control-asset-picker-preview-block');
    bodyEl.appendChild(imageEl);
  
    var noPreviewEl = document.createElement('span');
    this.noPreviewEl = noPreviewEl;
    noPreviewEl.innerHTML = 'No Image Selected';  
    YAHOO.util.Dom.addClass(noPreviewEl, 'cstudio-form-control-asset-picker-no-preview-content');
    imageEl.appendChild(noPreviewEl);

    /**
     * focus point area
     */
    var imageContainer = document.createElement('div');
    YAHOO.util.Dom.addClass(imageContainer, 'focuspoint-helper-tool-target');
    imageContainer.style.position = 'relative';

    var previewEl = document.createElement('img');
    this.previewEl = previewEl;
    YAHOO.util.Dom.addClass(previewEl, 'cstudio-form-control-asset-picker-preview-content');
    YAHOO.util.Dom.addClass(previewEl, 'focuspoint-helper-tool-img');
    previewEl.style.display = 'none';
    imageContainer.appendChild(previewEl);

    var overlayEl = document.createElement('img');
    overlayEl.id = 'focuspoint-target-overlay';
    YAHOO.util.Dom.addClass(overlayEl, 'focuspoint-target-overlay');
    overlayEl.style.cursor = 'pointer';
    overlayEl.style.opacity = .01;
    overlayEl.style.position = 'absolute';
    overlayEl.style.top = 0;
    overlayEl.style.left = 0;
    overlayEl.style.display = 'block';
    overlayEl.style.width = '100%';
    overlayEl.style.height = '100%';

    YAHOO.util.Event.addListener(
      overlayEl,
      'click',
      function (evt, context) {
        this._moveFocuspoint(evt.target, evt.layerX, evt.layerY);
        this._onChange(null, this);
      },
      this,
      true
    );

    var focusPointEl = document.createElement('img');
    focusPointEl.id = 'focuspoint';
    YAHOO.util.Dom.addClass(focusPointEl, 'focuspoint-reticle');
    focusPointEl.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NTc3MiwgMjAxNC8wMS8xMy0xOTo0NDowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo5YmY1NWFjZi02NTI5LTRiODAtOTQ2ZC1kNGFiOWNiN2FlYTIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6M0FGOEQxMDQyREFCMTFFNDgyOTNCN0ZCMzdERTQwOEYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6M0FGOEQxMDMyREFCMTFFNDgyOTNCN0ZCMzdERTQwOEYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowZTU4NmFlOC1lYWI5LTRlYWYtYWRiMy00Njk0NTQ5YjZiOWYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6OWJmNTVhY2YtNjUyOS00YjgwLTk0NmQtZDRhYjljYjdhZWEyIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+ns3RjwAACAtJREFUeNrsXWlsVFUYvX1KYgGDkSUUQdu6AZZi4lJZGhuDKxgQDCFEUCERQtQf4tLE+FP/uIREQ1DjQlBcAH+4QDXGgCUIURO0BVwQUNmkFG2k4BKo38k7hXGY5c1b7nsz853khLBN7z1n7v7d71b09PQYRXLgqARqiCIHzi6CMlYIa4X1wlHCGuEI4SDhucJ+wv7CAcIu4VFht/BP4WHhr8Ldwh3Cb4W7hIntpysSOoaMEd4ivF44jiK3CbdR0J+FHfzzXnbRlP4pHCy8UHix8Ap+Lv78C+EGYYuwPUkGJcUQtILxwpnCO4R/UyyItlF4MMSfNVQ4kWbD9L7C1cJ3hZviNiduQ84XzhfOY9ezUric3YstoBu8WzhbeEz4ivA1dnf2AUNiYLVwqfB34QrhJKETU1l66bAcK1gulK/Gdjlsz7KqhMuEX3PQRb8+R/ip8GTM3eZJlmMOy4XyfcXyVpXatLdS+DgHUMyARgofE+5P6GRnP8s3kuVtZ/krS8EQDJ5bhdcKG4SLOUMqBnSwvCj3NaxHU7GOIX2Ezwn3CafHPD6ERdRjL+vVp5jGECzePhdexAXdeyWykEY9xrJeraxn4rusqVx4Yfo6Q9hZYrsbnazX66zn1CR3Wc1s0g0l0kXlYwPr2xzWZ4a1MERLe4Er4MncPyoXYF/tI+4o3B90+h6GIWex+aI/nSL8oww3abGH9iH32LDqPxHXGOJwm+EC4c1laobhxib2xYbxy+nEZQi6qVq2jG5T3uimDjXUxbohzSljxjGjMNRhMnVp9vMBfg+oMO1bZNwt8y714Yzu6zbjbuX/KFwT9aA+koui24WbVf+saOBA3yj8Lqou6xzhKuETakZebKFOq6hbJC3kec6opqveBW237BU+GLYhTcI3uTfVqTp7Bk5FEQ+AE8kNYXVZaHIv0WU1ozAcoW4ve+m6vBryCAemNaqvL0C3HdQxcJeF1SfimcZxGqfwh0uNuzuMLn9/EEOWcRW6WDUNjGeMGxe20K8h2AbAQT9CZQ6pnoExmF3/1caNpix4DHmIg7maEQ46qOdiPy0EsbM72ToOqJahoYoD/CUmQzBerhZyr/B9NSN0HKCu8wtpIRXs6/CfNqqGoQO7wQhZxb5gj5cWMo6/qhnRALriqHe81y4LUegrVbdI8TZ1zttlobtCkMKNxm4UerkBkyXEEg9P7bYytZA64V9qRuSAvseNe4koZ5eF064W1csK1glvzWcITrjWq1ZWsIF6Zx1DHK4mcT/ioOoVOXC9bhsX4T2ZWghCeo6qGdYAnbupe8YuCwNMm+pkFTjaqM9mCKZi7aqRVbRR94yGVJss28KKyLDHpNwzSTekRg1JliE4QNGzD7v4jbMsNSQhgN5DshnSz2gUu21A777ZDME9bI1kt4tjqYakr9Txm4oirVgrf20swrKf0j29hfwj7FPE37Zi/DJB7397f5N+P+Q4m08x3vloLNIvUd/UYcLJNcAo4jcEO70DVSOrGJi61MhkSJVqZBWInT6czRBsm9SqRlbxv+2qdEP2mAgSqihyojqXITh4r1ONrGKMSQkoSTekzaRFQSgiR71JORRMNwQ5cXF/YajqZAXQGfuHP2UzBOGNuOUzQbWyggnUO2egHPaEmlQrK2gyp/fgshqy1qQFbykiA3Rel88QBDng+u4o1StSQN9Kkxblk8kQ9Ge4xjtTNYsU0He18Xg/BInpZ6lmkWIWdTZeDNnEv9PZVnSzK4c6ezIEzQhXrhaodpEAur5qMjyNobdw7cP3LVz84xXCB1TDUAE93zBZ3ifxmskBt0U7VMvAyJvJwWuuE1xReFj1DIzAuU6AYVy8XGc0G1AQYMxA2j/s7u7L9o+85MtCKqEldFcRrHUsyWWGV0OApznbmqG6+gJyVI6mjjnhJ+ciDrCOqMaegZyLuCV1l/FwmdZPVtJh2lIKwmqu4zwtHwrN2/uo8LJcswTFGSvyy6mbJ/jJbI2xBM8ZTeGsQZEZyGyNd0UaTQFZMfwk49/BFoKMzcNV94wYTn0WmAJTlPhNxo/zEmTZXMtvgCbkP40B1GWp8ZFWN+gLO0u50LnJ6EUfAIHTn3BWtcjPBwQ1pPe5I+SDx2sJ5XwdDuE8H3Dhd4/x+exR0Bd2TvCHYzXfwuZart1UC3XwbUYYhvSaMte4+10IaRlRhgN4K+s/N4gZYRkCnGSf+ZZxA78aymhqu5n1XmTCePE6gscWpwkPCheW+KOSC1jPaWF+blgPS6YDB1vvGDd3432mtJ64wN4UslPjPVyE8oSaiiSqx4lRSERW4KHFb0zpvMgznVPaX4yb4jX0vDBRtZBUNAlf5IoVp447i9AIHC7hPGM0W/z6qH6QjQfuUfgrhV8ad+/rWZOSbCXhGMTybmH5x5qI81E6liqG++9PGvd2FhZQ3wufMsm9YFrF8v1g3DPwOpb/eNQ/2LFcUZwLYGMSURfnCbcbN9RoUgxlyaTFJJZnO8t3lXE3CK3FpdkYQ/J1CfOMm/QfkeBIb77c2E3ijOMEvPA8my0AEZuIKjwchyBxG3KqHJy1YBp5p3E3KrEV8RkXmmFmScU1Mjw2cINxX3jGhiBO9RD4jFjbWAVJiiHp5mASgOfAJ1K8o5xutnOquYcmddK8Lq6SHe4rQeSBFL+a6yKMA/UcE2AyXij4WLg1bhOSbkgmg2o5wxlNcbEoG0LRK2mCQ1O62PXArENcC+3muIA10a4kGVCMhpQVHJUgWfhPgAEA1wKkPWuW8SEAAAAASUVORK5CYII=';
    focusPointEl.style.position = 'absolute';
    focusPointEl.style.height = 'auto';
    focusPointEl.style.top = '40%';
    focusPointEl.style.left = '40%';
    focusPointEl.style.width = '20%';
    imageContainer.appendChild(focusPointEl);
    imageContainer.appendChild(overlayEl);
    imageEl.appendChild(imageContainer);

    /**
     * zoom -> Previe DLg
     */
    var zoomEl = document.createElement('a');
    this.zoomEl = zoomEl;
    zoomEl.type = 'button';
    YAHOO.util.Dom.addClass(
      zoomEl,
      'cstudio-form-control-hover-btn cstudio-form-control-asset-picker-zoom-button fa fa-search-plus'
    );
    zoomEl.style.display = 'none';
    imageEl.appendChild(zoomEl);

    var downloadEl = document.createElement('a');
    this.downloadEl = downloadEl;
    downloadEl.href = inputEl.value;
    downloadEl.target = '_new';
    YAHOO.util.Dom.addClass(
      downloadEl,
      'cstudio-form-control-hover-btn cstudio-form-control-asset-picker-download-button fa fa-download'
    );
    downloadEl.style.display = 'none';
    imageEl.appendChild(downloadEl);

    var ctrlOptionsEl = document.createElement('div');
    YAHOO.util.Dom.addClass(ctrlOptionsEl, 'cstudio-form-control-image-picker-options');
    bodyEl.appendChild(ctrlOptionsEl);

    this.ctrlOptionsEl = ctrlOptionsEl;

    let dropdownLabel;

    if (this.inputEl.value === null || this.inputEl.value === '') {
      dropdownLabel = CMgs.format(langBundle, 'add');
    } else {
      dropdownLabel = CMgs.format(langBundle, 'replace');
    }

    // dropdownBtn and dropdownMenu
    const $addBtn = $(
      `<button id="add-image" class="cstudio-button btn btn-default btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">${dropdownLabel}</button>`
    );
    const $dropdown = $('<div class="dropdown"></div>');
    const $dropdownMenu = $('<ul class="dropdown-menu pull-left"></ul>');
    this.$dropdown = $dropdown;
    this.$dropdownMenu = $dropdownMenu;
    this.$addBtn = $addBtn;
    $dropdown.append($addBtn);
    $dropdown.append($dropdownMenu);

    $(ctrlOptionsEl).append($dropdown);

    var delEl = document.createElement('input');
    this.delEl = delEl;
    delEl.type = 'button';
    delEl.value = CMgs.format(langBundle, 'delete');
    delEl.style.position = 'relative';
    YAHOO.util.Dom.addClass(delEl, 'btn btn-default btn-sm');

    ctrlOptionsEl.appendChild(delEl);

    for (var i = 0; i < config.properties.length; i++) {
      var prop = config.properties[i];

      if (prop.name === 'imageManager') {
        if (prop.value && prop.value !== '') {
          this.datasources = prop.value;
        }
      }

      if (prop.name === 'focuspoint_y') {
        if (prop.value && prop.value !== '') {
          var float = parseFloat(prop.value);
          if (float >= -1.0 && float <= 1.0) {
            this.predefinedFocuspointY = float;
          }
        }
      }

      if (prop.name === 'focuspoint_x') {
        if (prop.value && prop.value !== '') {
          var float = parseFloat(prop.value);
          if (float >= -1.0 && float <= 1.0) {
            this.predefinedFocuspointX = float;
          }
        }
      }

      if (prop.name === 'readonly' && prop.value === 'true') {
        this.readonly = true;
      }
    }

    var helpContainerEl = document.createElement('div');
    YAHOO.util.Dom.addClass(helpContainerEl, 'cstudio-form-field-help-container');
    ctrlOptionsEl.appendChild(helpContainerEl);

    this.renderHelp(config, helpContainerEl);

    this.renderFocusPointCoords(bodyEl);

    var descriptionEl = document.createElement('span');
    YAHOO.util.Dom.addClass(descriptionEl, 'description');
    YAHOO.util.Dom.addClass(descriptionEl, 'cstudio-form-field-description');
    descriptionEl.textContent = config.description;
    descriptionEl.style.position = 'relative';

    containerEl.appendChild(titleEl);
    containerEl.appendChild(validEl);
    containerEl.appendChild(controlWidgetContainerEl);
    containerEl.appendChild(descriptionEl);

    if (this.readonly === true) {
      this.$addBtn.attr('disabled', 'true');
      this.$addBtn.addClass('cstudio-button-disabled');
      delEl.disabled = true;
      YAHOO.util.Dom.addClass(delEl, 'cstudio-button-disabled');
    }

    YAHOO.util.Event.addListener(
      imageEl,
      'click',
      function (evt, context) {
        context.form.setFocusedField(context);
      },
      this,
      true
    );

    // adding options to $dropdownMenu;
    if (!this.$addBtn.attr('disabled')) {
      this.addImage();
    }
    YAHOO.util.Event.addListener(
      $addBtn[0],
      'click',
      function (evt, context) {
        context.form.setFocusedField(context);
      },
      this,
      true
    );

    YAHOO.util.Event.addListener(
      delEl,
      'click',
      function (evt, context) {
        context.form.setFocusedField(context);
        this.deleteImage();
      },
      this,
      true
    );
    YAHOO.util.Event.addListener(zoomEl, 'click', this.createDialog, this, true);
    YAHOO.util.Event.addListener(imageEl, 'mouseover', this.showButtons, this, true);
    YAHOO.util.Event.addListener(imageEl, 'mouseout', this.hideButtons, this, true);
  },

  showButtons: function (evt) {
    if (this.value !== '') {
      if (this.originalWidth > this.previewBoxWidth || this.originalHeight > this.previewBoxHeight) {
        this.zoomEl.style.display = 'inline-block';
        this.downloadEl.style.marginLeft = '0';
      } else {
        this.downloadEl.style.marginLeft = '-20px';
      }
      this.downloadEl.style.display = 'inline-block';
    }
  },

  hideButtons: function (evt) {
    this.zoomEl.style.display = 'none';
    this.downloadEl.style.display = 'none';
  },

  getValue: function () {
    return this.value;
  },

  // render a label showing value of focus point
  renderFocusPointCoords: function (containerEl) {
    var requirementsEl = document.createElement('div');
    requirementsEl.style.width = "110px";
    requirementsEl.style.bottom = "10px";
    requirementsEl.style.display = "block";
    requirementsEl.innerHTML =
      '<div class="title" style="font-size:14px;line-height:16px;">Focus point</div>' +
      '<div id="focuspoint-coords" class="width-constraint" style="font-size:14px;line-height:16px;">'  + this.predefinedFocuspointX.toFixed(3) + ' x ' + this.predefinedFocuspointY.toFixed(3) + '</div>';
    YAHOO.util.Dom.addClass(requirementsEl, 'cstudio-form-field-image-picker-constraints');
    containerEl.appendChild(requirementsEl);
  },

  setValue: function (value, attribute) {
    // read stored focuspoint coordinates
    var _value = value;
    if (_value) {
      var index = _value.indexOf("?");
      if (index >= 0) {
        var startindex = _value.indexOf("focuspoint_x=");
        var endindex = _value.indexOf("&focuspoint_y=");
        if (startindex >= 0 && endindex >= 0) {
          self.focuspoint_x = parseFloat(_value.substring(startindex + 13, endindex));
          self.focuspoint_y = parseFloat(_value.substring(endindex + 14));
          this._updateFocusPoint(self.focuspoint_x, self.focuspoint_y);
          this._updateReticlePosition(document.getElementById('focuspoint-target-overlay'), self.focuspoint_x, self.focuspoint_y, true);
        }
        _value = _value.substring(0, index);
      }
      else {
        self.focuspoint_x = self.predefinedFocuspointX;
        self.focuspoint_y = self.predefinedFocuspointY;
      }
    }
    var _self = this;
    this.value = _value;
    this.remote = attribute === true ? true : false;
    this.inputEl.value = _value;

    var CMgs = CStudioAuthoring.Messages;
    var langBundle = CMgs.getBundle('contentTypes', CStudioAuthoringContext.lang);

    this.external = value.indexOf('?crafterCMIS=true') !== -1 || value.indexOf('http') <= 0;

    if (_value === null || _value === '') {
      this.noPreviewEl.style.display = 'inline';
      this.noPreviewEl.parentElement.classList.add('no-selection');
    } else {
      if (this.external) {
        this.previewEl.src = value.replace(/ /g, '%20');
      } else {
        this.previewEl.src = CStudioAuthoringContext.previewAppBaseUri + value.replace(/ /g, '%20');
      }

      this.previewEl.style.display = 'inline';
      this.noPreviewEl.style.display = 'none';
      this.noPreviewEl.parentElement.classList.remove('no-selection');
      this.urlEl.textContent = this.external ? value.replace('?crafterCMIS=true', '') : value;
      this.downloadEl.href = this.external ? value.replace('?crafterCMIS=true', '') : value;

      this.$addBtn.text(CMgs.format(langBundle, 'replace'));
      var image = new Image();
      image.src = '';

      function imageLoaded() {
        _self.originalWidth = this.width;
        _self.originalHeight = this.height;
        _self._updateReticlePosition(document.getElementById('focuspoint-target-overlay'), _self.focuspoint_x, _self.focuspoint_y, true);
      }
      image.addEventListener('load', imageLoaded, false);
      image.src = CStudioAuthoringContext.previewAppBaseUri + value.replace(/ /g, '%20') + '?' + new Date().getTime();
    }
    this._onChange(null, this);
    this.edited = false;
  },

  getName: function () {
    return 'Imagic';
  },

  getSupportedProperties: function () {
    return [
      { label: 'FocusPoint.x', name: 'focuspoint_x', type: 'float' },
      { label: 'FocusPoint.y', name: 'focuspoint_y', type: 'float' },
      {
        label: CMgs.format(langBundle, 'datasource'),
        name: 'imageManager',
        type: 'datasource:image'
      },
      { label: CMgs.format(langBundle, 'readonly'), name: 'readonly', type: 'boolean' }
    ];
  },

  getSupportedConstraints: function () {
    return [{ label: CMgs.format(langBundle, 'required'), name: 'required', type: 'boolean' }];
  },

  getSupportedPostFixes: function () {
    return this.supportedPostFixes;
  }
});

CStudioAuthoring.Utils.addCss('/static-assets/libs/cropper/dist/cropper.css');
CStudioAuthoring.Utils.addCss('/static-assets/themes/cstudioTheme/css/icons.css');

CStudioAuthoring.Module.moduleLoaded('Imagic', CStudioForms.Controls.Imagic);
CStudioAuthoring.Module.requireModule('jquery-cropper', '/static-assets/libs/cropper/dist/cropper.js');
