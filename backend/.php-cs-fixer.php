<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/src')
    ->in(__DIR__ . '/tests')
    ->exclude('var')
;

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12'                            => true,
        '@PHP80Migration'                   => true,
        '@PHP80Migration:risky'             => true,
        'array_syntax'                      => ['syntax' => 'short'],
        'ordered_imports'                   => ['sort_algorithm' => 'alpha'],
        'no_unused_imports'                 => true,
        'not_operator_with_successor_space' => true,
        'trailing_comma_in_multiline'       => true,
        'phpdoc_order'                      => true,
        'void_return'                       => true,
        'declare_strict_types'              => true,
        'strict_param'                      => true,
        'no_superfluous_phpdoc_tags'        => ['allow_mixed' => true],
        'single_quote'                      => true,
        'blank_line_after_opening_tag'      => true,
    ])
    ->setRiskyAllowed(true)
    ->setFinder($finder)
;
