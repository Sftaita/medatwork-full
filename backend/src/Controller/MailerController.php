<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;

class MailerController
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly Environment $twig,
    ) {
    }

    /**
     * Envoie un email HTML (+ texte brut automatique) depuis no-reply@medatwork.be.
     *
     * @param string   $to         Adresse du destinataire
     * @param string   $subject    Sujet de l'email
     * @param string   $template   Chemin du template Twig (ex: email/activationEmail.html.twig)
     * @param array<string, mixed> $parameters Variables transmises au template
     * @param string   $replyTo    Adresse Reply-To (support@ par défaut)
     */
    public function sendEmail(
        string $to,
        string $subject,
        string $template,
        array $parameters,
        string $replyTo = 'support@medatwork.be'
    ): void {
        $html = $this->twig->render($template, $parameters);

        // Version texte brut extraite du HTML pour éviter le spam
        $text = strip_tags(html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;
        $text = preg_replace('/(\s*\n){3,}/', "\n\n", $text) ?? $text;

        $email = (new Email())
            ->from(new Address('no-reply@medatwork.be', 'MED@WORK'))
            ->to($to)
            ->replyTo($replyTo)
            ->subject($subject)
            ->text(trim($text))
            ->html($html);

        $this->mailer->send($email);
    }
}
