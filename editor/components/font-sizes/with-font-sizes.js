/**
 * External dependencies
 */
import { find, get, isString, reduce, upperFirst } from 'lodash';

/**
 * WordPress dependencies
 */
import { createHigherOrderComponent, Component, compose } from '@wordpress/element';
import { withSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { getFontSize, getFontSizeClass } from './utils';

const DEFAULT_FONT_SIZES = [];

/**
 * Higher-order component, which handles font size logic for class generation,
 * font size value retrieval, and font size change handling.
 *
 * @param {...(object|string)} args The arguments can be strings or objects. If the argument is an object,
 *                                  it should contain the font size name as key and the font size context as value.
 *                                  If the argument is a string the value should be the font size attribute name,
 *                                  the font size context is assumed to be 'font-size'.
 *                                  Font size context represents a type of font-size setting core only uses 'font-size'.
 *                                  The class name of the font size is generated using 'has' followed by the font size slug
 *                                  and ending with the font size context all in kebab case e.g: has-large-font-size.
 *
 *
 * @return {Function} Higher-order component.
 */
export default ( ...args ) => {
	const fontSizeMap = reduce( args, ( fontSizeAccumulator, arg ) => {
		return {
			...fontSizeAccumulator,
			...( isString( arg ) ? { [ arg ]: 'font-size' } : arg ),
		};
	}, {} );

	return createHigherOrderComponent(
		compose( [
			withSelect( ( select ) => {
				const settings = select( 'core/editor' ).getEditorSettings();
				return {
					fontSizes: get( settings, [ 'fontSizes' ], DEFAULT_FONT_SIZES ),
				};
			} ),
			( WrappedComponent ) => {
				return class extends Component {
					constructor( props ) {
						super( props );

						this.setters = this.createSetters();

						this.state = {};
					}

					createSetters() {
						return reduce( fontSizeMap, ( settersAccumulator, fontSizeContext, fontSizeAttributeName ) => {
							const upperFirstFontSizeAttributeName = upperFirst( fontSizeAttributeName );
							const customFontSizeAttributeName = `custom${ upperFirstFontSizeAttributeName }`;
							settersAccumulator[ `set${ upperFirstFontSizeAttributeName }` ] =
								this.createSetFontSize( fontSizeAttributeName, customFontSizeAttributeName );
							return settersAccumulator;
						}, {} );
					}

					createSetFontSize( fontSizeAttributeName, customFontSizeAttributeName ) {
						return ( fontSizeValue ) => {
							const fontSizeObject = find( this.props.fontSizes, { size: fontSizeValue } );
							this.props.setAttributes( {
								[ fontSizeAttributeName ]: fontSizeObject && fontSizeObject.slug ? fontSizeObject.slug : undefined,
								[ customFontSizeAttributeName ]: fontSizeObject && fontSizeObject.slug ? undefined : fontSizeValue,
							} );
						};
					}

					static getDerivedStateFromProps( { attributes, fontSizes }, previousState ) {
						return reduce( fontSizeMap, ( newState, fontSizeContext, fontSizeAttributeName ) => {
							const fontSizeAttribute = attributes[ fontSizeAttributeName ];
							const fontSizeObject = getFontSize(
								fontSizes,
								fontSizeAttribute,
								attributes[ `custom${ upperFirst( fontSizeAttributeName ) }` ]
							);
							const previousFontSizeObject = previousState[ fontSizeAttributeName ];

							if ( previousFontSizeObject && previousFontSizeObject.size === fontSizeObject.size ) {
								newState[ fontSizeAttributeName ] = previousFontSizeObject;
							} else {
								newState[ fontSizeAttributeName ] = {
									...fontSizeObject,
									class: fontSizeAttribute && getFontSizeClass( fontSizeContext, fontSizeAttribute ),
								};
							}
							return newState;
						}, {} );
					}

					render() {
						return (
							<WrappedComponent
								{ ...{
									...this.props,
									fontSizes: undefined,
									...this.state,
									...this.setters,
								} }
							/>
						);
					}
				};
			},
		] ),
		'withFontSizes'
	);
};
