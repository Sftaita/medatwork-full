<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\WeekTemplatesRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * WeekTemplates Entity
 */

#[ORM\Entity(repositoryClass: WeekTemplatesRepository::class)]
class WeekTemplates
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    private string $title;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\Length(max: 255)]
    private ?string $description = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\Regex('/^#(?:[0-9a-fA-F]{3}){1,2}$/')]
    private ?string $color = null;

    /** @var Collection<int, WeekTask> */
    #[ORM\OneToMany(targetEntity: WeekTask::class, mappedBy: 'weekTemplate')]
    private Collection $weekTaskList;

    /** @var Collection<int, ManagerWeekTemplate> */
    #[ORM\OneToMany(targetEntity: ManagerWeekTemplate::class, mappedBy: 'weekTemplate')]
    private Collection $managerWeekTemplates;

    public function __construct()
    {
        $this->weekTaskList = new ArrayCollection();
        $this->managerWeekTemplates = new ArrayCollection();
    }


    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    public function getColor(): ?string
    {
        return $this->color;
    }

    public function setColor(?string $color): self
    {
        $this->color = $color;

        return $this;
    }

    /**
     * @return Collection<int, WeekTask>
     */
    public function getWeekTaskList(): Collection
    {
        return $this->weekTaskList;
    }

    public function addWeekTaskList(WeekTask $weekTaskList): self
    {
        if (! $this->weekTaskList->contains($weekTaskList)) {
            $this->weekTaskList[] = $weekTaskList;
            $weekTaskList->setWeekTemplate($this);
        }

        return $this;
    }

    public function removeWeekTaskList(WeekTask $weekTaskList): self
    {
        if ($this->weekTaskList->removeElement($weekTaskList)) {
            // set the owning side to null (unless already changed)
            if ($weekTaskList->getWeekTemplate() === $this) {
                $weekTaskList->setWeekTemplate(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ManagerWeekTemplate>
     */
    public function getManagerWeekTemplates(): Collection
    {
        return $this->managerWeekTemplates;
    }

    public function addManagerWeekTemplate(ManagerWeekTemplate $managerWeekTemplate): self
    {
        if (! $this->managerWeekTemplates->contains($managerWeekTemplate)) {
            $this->managerWeekTemplates[] = $managerWeekTemplate;
            $managerWeekTemplate->setWeekTemplate($this);
        }

        return $this;
    }

    public function removeManagerWeekTemplate(ManagerWeekTemplate $managerWeekTemplate): self
    {
        if ($this->managerWeekTemplates->removeElement($managerWeekTemplate)) {
            // set the owning side to null (unless already changed)
            if ($managerWeekTemplate->getWeekTemplate() === $this) {
                $managerWeekTemplate->setWeekTemplate(null);
            }
        }

        return $this;
    }
}
