(function (factory, window) {
    if (typeof define === 'function' && define.amd) {
        define(['leaflet', 'proj4'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('leaflet'), require('proj4'));
    }
    if (typeof window !== 'undefined' && window.L) {
        window.L.GridLayer.reproject = factory(L, proj4);
    }
}(function (L, proj4) {
	L.GridLayer.Reproject = L.GridLayer.extend({
		options: {
			// @option crs: L.CRS
			// The coordinate reference system of the grid layer.
			crs: null,

			// @option fromCRS: L.CRS
			// The coordinate reference system of the tiles.
			fromCRS: null,

			// @option fromBounds: L.LatLngBounds
			// The bounds of the tiles in `fromCRS`.
			fromBounds: null,

			// @option proj4: Function
			// The `proj4` function.
			proj4: proj4,

			// @option transform: Function
			// A function to transform the tile coordinates.
			transform: null,

			// @option untransform: Function
			// A function to untransform the tile coordinates.
			untransform: null
		},

		initialize: function(url, options) {
			this._url = url;
			L.setOptions(this, options);

			var crs = this.options.crs;
			var fromCRS = this.options.fromCRS = this.options.fromCRS || L.CRS.EPSG3857;

			var fromProj = this._proj(fromCRS.code, fromCRS.proj4def);
			var toProj = this._proj(crs.code, crs.proj4def);
			this._transform = this.options.transform || fromProj.forward;
			this._untransform = this.options.untransform || fromProj.inverse;
		},

		onAdd: function(map) {
			L.GridLayer.prototype.onAdd.call(this, map);
			this._map = map;
			var crs = this.options.crs;
			this.fromBounds = this._calculateBounds(crs, this.options.fromCRS, this.options.fromBounds);
			this._draw();
		},

		onRemove: function() {
			L.GridLayer.prototype.onRemove.call(this, this._map);
			this.fromBounds = null;
		},

		createTile: function(coords, done) {
			var tile = L.DomUtil.create('canvas', 'leaflet-tile');
			var size = this.getTileSize();
			tile.width = size.x;
			tile.height = size.y;
			var image = new Image();
			image.crossOrigin = 'Anonymous';
			image.onload = L.bind(function() {
				var ctx = tile.getContext('2d');
				ctx.drawImage(image, 0, 0);
				done(null, tile);
			}, this);
			image.onerror = L.bind(function(e) {
				done(e);
			}, this);
			var url = this._getTileUrl(coords);
			image.src = url;
			return tile;
		},

		_getTileUrl: function(coords) {
			var newCoords = this._untransformCoords(coords);
			return L.Util.template(this._url, L.extend({
				s: this._getSubdomain(coords),
				x: newCoords.x,
				y: newCoords.y,
				z: newCoords.z
			}, this.options));
		},

		_untransformCoords: function(coords) {
			var untransformedZoom = this._map.getZoom() - this.options.fromCRS.zoom;
			return {
				x: coords.x,
				y: coords.y,
				z: untransformedZoom
			};
		},

		_calculateBounds: function(crs, fromCRS, fromBounds) {
			if (fromBounds) {
				return fromBounds;
			}
			var fromNw = fromCRS.projection.unproject(new L.Point(fromCRS.tileMatrix.getX(0), fromCRS.tileMatrix.getY(0)));
			var fromSe = fromCRS.projection.unproject(new L.Point(fromCRS.tileMatrix.getX(fromCRS.tileMatrix.x) - 1, fromCRS.tileMatrix.getY(fromCRS.tileMatrix.y) - 1));
			return new L.LatLngBounds(fromNw, fromSe);
		},

		_proj: function(code, proj4def) {
			if (proj4def) {
				return this.options.proj4(code, proj4def);
			}
			return this.options.proj4(code);
		}
	});

	return L.GridLayer.Reproject;

}, window));