<?php

declare(strict_types=1);

namespace App\Services\Utils;

class Dictionary
{
    /**
     * Translate speciality abreviation to french complete name
     *
     * @param string $speciality abreviation
     * @return string Complete french name
     */
    public function translateSpeciality(string $speciality): string
    {
        $list = [
            'anesthesiology' => 'Anesthésiologie',
            'cardio' => 'Cardiologie',
            'dig' => 'Chirurgie digestive',
            'general' => 'Chirurgie générale',
            'maxillofacial' => 'Chirurgie maxillo-faciale',
            'ortho' => 'Chirurgie orthopédique',
            'plastic' => 'Chirurgie plastique',
            'thor' => 'Chirurgie thoracique',
            'vasc' => 'Chirurgie vasculaire',
            'dermatology' => 'Dermatologie',
            'endocrinology' => 'Endocrinologie',
            'gastro' => 'Gastro-entérologie',
            'geriatrics' => 'Gériatrie',
            'gynaeco' => 'Gynécologie et obstétrique',
            'haematology' => 'Hématologie',
            'infectiousDisease' => 'Maladies infectieuses',
            'internalMedecin' => 'Médecine interne',
            'rehab' => 'Médecine physique et de réadaptation',
            'nephrology' => 'Néphrologie',
            'neurosurgery' => 'Neurochirurgie',
            'neurology' => 'Neurologie',
            'oncology' => 'Oncologie',
            'ophthalmology' => 'Ophtalmologie',
            'otolaryngology' => 'Oto-rhino-laryngologie',
            'pediatric' => 'Pédiatrie',
            'pedopsychiatry' => 'Pédopsychiatrie',
            'pulmonology' => 'Pneumologie',
            'psychiatry' => 'Psychiatrie',
            'radiology' => 'Radiologie',
            'rheumatology' => 'Rhumatologie',
            'intensiveCare' => 'Soins intensifs',
            'palliative' => 'Soins palliatifs',
            'emergency' => 'Urgences',
            'uro' => 'Urologie',
        ];


        if (isset($list[$speciality])) {
            return $list[$speciality];
        } else {
            return '';
        }

    }
}
