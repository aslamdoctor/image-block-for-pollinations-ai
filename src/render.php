<?php
if ( $attributes['generatedImageId'] ) : ?>
<div <?php echo get_block_wrapper_attributes(); ?>>
		<?php echo wp_kses_post( $content ); ?>
</div>
<?php
endif;
?>
