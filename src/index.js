import { registerBlockType } from '@wordpress/blocks';
import { flower } from './icons';
import './style.scss';

/**
 * Internal dependencies
 */
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
/**
 * Register new block.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: Save,
	icon: flower,
} );
